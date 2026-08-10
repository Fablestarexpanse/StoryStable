/**
 * Agent context assembly (spec §8.3 / PRODUCT_SPEC §10.4).
 *
 * The creator must be able to inspect and edit exactly what is sent before it
 * is sent, so this builds an explicit, inspectable context set rather than
 * silently stuffing a prompt. It also applies the knowledge model: when a
 * point-of-view character is set, facts that character does not know are
 * withheld and named, so an agent cannot write omniscient dialogue or leak a
 * reveal the audience has seen but the character has not.
 */
import type { ParsedNote } from './links.js';
import type { LinkIndex } from './links.js';
import { buildKnowledgeModel, spoilersFor, stateAt, isUnknownValue } from './knowledge.js';
import { formatValue } from './properties.js';

export interface ContextItem {
  /** Note path, or a synthetic id for derived sections. */
  id: string;
  label: string;
  kind: 'note' | 'canon' | 'knowledge' | 'relationship';
  text: string;
  /** Rough token estimate; see estimateTokens. */
  tokens: number;
  /** Included by default; the user may toggle it off before sending. */
  included: boolean;
}

export interface WithheldFact {
  fact: string;
  reason: string;
}

export interface AgentContext {
  items: ContextItem[];
  /** Facts deliberately kept out because the POV character does not know them. */
  withheld: WithheldFact[];
  /** Total estimated tokens for included items. */
  tokens: number;
}

export interface ContextRequest {
  notes: readonly ParsedNote[];
  linkIndex: LinkIndex;
  /** Note the creator is working on. */
  focusPath: string | null;
  /** Character whose knowledge bounds the context, by frontmatter id. */
  povCharacterId?: string | null;
  /** Story position to resolve knowledge at. */
  sceneId?: string | null;
  /** Include notes linked from the focus note. */
  includeLinked?: boolean;
}

/**
 * Rough token estimate — deliberately approximate and labelled as such in the
 * UI. Accurate counting requires a provider round-trip; this is only for
 * showing relative context size before sending.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function noteItem(note: ParsedNote, kind: ContextItem['kind'] = 'note'): ContextItem {
  const props = Object.entries(note.frontmatter)
    .filter(([key]) => key !== 'id' && key !== 'schema_version')
    .map(([key, value]) => `${key}: ${formatValue(value)}`)
    .join('\n');
  const text = `# ${note.title}\n${props}\n\n${note.body.trim()}`;
  return {
    id: note.path,
    label: note.title,
    kind,
    text,
    tokens: estimateTokens(text),
    included: true,
  };
}

/**
 * Assemble context for an agent request. Never throws; a vault with no
 * matching notes yields an empty context rather than an error.
 */
export function buildAgentContext(request: ContextRequest): AgentContext {
  const { notes, linkIndex, focusPath, povCharacterId, sceneId, includeLinked = true } = request;
  const items: ContextItem[] = [];
  const seen = new Set<string>();

  const byPath = new Map(notes.map((n) => [n.path, n]));

  const focus = focusPath === null ? undefined : byPath.get(focusPath);
  if (focus) {
    items.push(noteItem(focus));
    seen.add(focus.path);
  }

  if (focus && includeLinked) {
    // Outgoing links first, then backlinks — both are "what this note touches".
    const linked = new Set<string>();
    for (const { from, to } of linkIndex.resolved) {
      if (from === focus.path) linked.add(to);
      if (to === focus.path) linked.add(from);
    }
    for (const path of [...linked].sort()) {
      const note = byPath.get(path);
      if (!note || seen.has(path)) continue;
      items.push(noteItem(note, 'relationship'));
      seen.add(path);
    }
  }

  // Locked canon is always relevant — an agent must not contradict it.
  for (const note of notes) {
    if (seen.has(note.path)) continue;
    if (note.frontmatter.canon_level !== 'locked') continue;
    items.push(noteItem(note, 'canon'));
    seen.add(note.path);
  }

  // Knowledge layer.
  const withheld: WithheldFact[] = [];
  const model = buildKnowledgeModel(notes);
  if (model.snapshots.length > 0) {
    const position = sceneId ?? null;
    const { worldState, knowledge } = stateAt(model, position);

    if (povCharacterId !== undefined && povCharacterId !== null && povCharacterId !== '') {
      const known = knowledge[povCharacterId] ?? {};
      const lines = Object.entries(known)
        .filter(([, value]) => !isUnknownValue(value))
        .map(([fact, value]) => `${fact}: ${formatValue(value)}`);
      const text =
        lines.length > 0
          ? `Facts ${povCharacterId} knows at this point:\n${lines.join('\n')}`
          : `${povCharacterId} knows none of the tracked facts at this point.`;
      items.push({
        id: 'knowledge:pov',
        label: `${povCharacterId} knowledge`,
        kind: 'knowledge',
        text,
        tokens: estimateTokens(text),
        included: true,
      });

      for (const fact of spoilersFor(model, povCharacterId, position)) {
        withheld.push({
          fact,
          reason: `the audience knows this, but ${povCharacterId} does not`,
        });
      }
      // World truths the character has no belief about are withheld too.
      for (const [fact, value] of Object.entries(worldState)) {
        if (isUnknownValue(value)) continue;
        if (!isUnknownValue(known[fact] ?? null)) continue;
        if (withheld.some((w) => w.fact === fact)) continue;
        withheld.push({ fact, reason: `world truth unknown to ${povCharacterId}` });
      }
    } else {
      const lines = Object.entries(worldState).map(
        ([fact, value]) => `${fact}: ${formatValue(value)}`,
      );
      if (lines.length > 0) {
        const text = `World state at this point:\n${lines.join('\n')}`;
        items.push({
          id: 'knowledge:world',
          label: 'World state',
          kind: 'knowledge',
          text,
          tokens: estimateTokens(text),
          included: true,
        });
      }
    }
  }

  return {
    items,
    withheld,
    tokens: items.filter((i) => i.included).reduce((sum, i) => sum + i.tokens, 0),
  };
}

/** Render the included context items into the prompt body. */
export function renderContext(context: AgentContext): string {
  return context.items
    .filter((i) => i.included)
    .map((i) => `<context source="${i.id}" kind="${i.kind}">\n${i.text}\n</context>`)
    .join('\n\n');
}

/**
 * The instruction that keeps an agent inside the point-of-view character's
 * knowledge. Returns null when nothing is being withheld, so no pointless
 * negative instruction is added.
 */
export function spoilerInstruction(
  context: AgentContext,
  povCharacterId: string | null,
): string | null {
  if (context.withheld.length === 0 || povCharacterId === null || povCharacterId === '') {
    return null;
  }
  const facts = context.withheld.map((w) => `- ${w.fact} (${w.reason})`).join('\n');
  return [
    `Write from within ${povCharacterId}'s knowledge. These facts are true or known to`,
    'the audience, but this character does not know them. Do not state them, imply',
    'them, or have the character act on them:',
    facts,
  ].join('\n');
}
