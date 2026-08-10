import { describe, expect, it } from 'vitest';
import { parseNote, buildLinkIndex } from '../src/links.js';
import {
  buildAgentContext,
  renderContext,
  spoilerInstruction,
  estimateTokens,
} from '../src/context.js';
import { AGENTS, agentById } from '../src/agents.js';

const note = (path: string, source: string) => parseNote({ path, source });

const lan = note(
  'World/Characters/Lan.md',
  '---\ntitle: Lan\nid: char_lan\ncanon_level: locked\n---\nA pilot. Allied with [[Mira]].',
);
const mira = note('World/Characters/Mira.md', '---\ntitle: Mira\nid: char_mira\n---\nEngineer.');
const ring = note('World/Locations/Ring.md', '---\ntitle: Ring\nid: loc_ring\n---\nDebris field.');
const scene = note(
  'Story/Scenes/S14.md',
  '---\ntitle: S14\nid: scene_014\ntype: scene\norder: 14\n---\n',
);
const snapshot = note(
  'Production/StateSnapshots/s14.md',
  [
    '---',
    'title: S14 end',
    'id: state_s14',
    'type: state_snapshot',
    'story_position:',
    '  scene_id: scene_014',
    '  phase: end',
    'world_state:',
    '  char_lan:',
    '    left_hand: burned',
    'knowledge:',
    '  audience:',
    '    fablestar_recognizes_lan: true',
    '  char_mira:',
    '    fablestar_recognizes_lan: unknown',
    '---',
  ].join('\n'),
);

const notes = [lan, mira, ring, scene, snapshot];
const linkIndex = buildLinkIndex(notes);

describe('estimateTokens', () => {
  it('scales with text length and is labelled approximate by callers', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('a'.repeat(400))).toBe(100);
  });
});

describe('buildAgentContext', () => {
  it('puts the focus note first', () => {
    const ctx = buildAgentContext({ notes, linkIndex, focusPath: mira.path });
    expect(ctx.items[0]?.id).toBe(mira.path);
  });

  it('includes linked notes', () => {
    const ctx = buildAgentContext({ notes, linkIndex, focusPath: lan.path });
    expect(ctx.items.map((i) => i.id)).toContain(mira.path);
  });

  it('can exclude linked notes', () => {
    const ctx = buildAgentContext({
      notes,
      linkIndex,
      focusPath: lan.path,
      includeLinked: false,
    });
    const relationshipItems = ctx.items.filter((i) => i.kind === 'relationship');
    expect(relationshipItems).toHaveLength(0);
  });

  it('always includes locked canon', () => {
    const ctx = buildAgentContext({ notes, linkIndex, focusPath: ring.path });
    expect(ctx.items.some((i) => i.kind === 'canon' && i.id === lan.path)).toBe(true);
  });

  it('never duplicates a note across sections', () => {
    const ctx = buildAgentContext({ notes, linkIndex, focusPath: lan.path });
    const ids = ctx.items.filter((i) => i.kind !== 'knowledge').map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sums tokens across included items only', () => {
    const ctx = buildAgentContext({ notes, linkIndex, focusPath: lan.path });
    const expected = ctx.items
      .filter((i) => i.included)
      .reduce((sum, item) => sum + item.tokens, 0);
    expect(ctx.tokens).toBe(expected);
  });

  it('returns an empty context for an empty vault rather than throwing', () => {
    const ctx = buildAgentContext({
      notes: [],
      linkIndex: buildLinkIndex([]),
      focusPath: null,
    });
    expect(ctx.items).toEqual([]);
    expect(ctx.tokens).toBe(0);
  });
});

describe('point-of-view spoiler guard', () => {
  const ctx = buildAgentContext({
    notes,
    linkIndex,
    focusPath: mira.path,
    povCharacterId: 'char_mira',
    sceneId: 'scene_014',
  });

  it('withholds what the audience knows but the character does not', () => {
    expect(ctx.withheld.map((w) => w.fact)).toContain('fablestar_recognizes_lan');
  });

  it('withholds world truths the character has no belief about', () => {
    expect(ctx.withheld.some((w) => w.fact === 'char_lan.left_hand')).toBe(true);
  });

  it('never lists the same withheld fact twice', () => {
    const facts = ctx.withheld.map((w) => w.fact);
    expect(new Set(facts).size).toBe(facts.length);
  });

  it('includes a knowledge item describing what the character does know', () => {
    expect(ctx.items.some((i) => i.kind === 'knowledge' && i.label.includes('char_mira'))).toBe(
      true,
    );
  });

  it('withholds nothing when no point of view is set', () => {
    const open = buildAgentContext({
      notes,
      linkIndex,
      focusPath: mira.path,
      sceneId: 'scene_014',
    });
    expect(open.withheld).toEqual([]);
    expect(open.items.some((i) => i.id === 'knowledge:world')).toBe(true);
  });
});

describe('spoilerInstruction', () => {
  it('names each withheld fact and its reason', () => {
    const ctx = buildAgentContext({
      notes,
      linkIndex,
      focusPath: mira.path,
      povCharacterId: 'char_mira',
      sceneId: 'scene_014',
    });
    const instruction = spoilerInstruction(ctx, 'char_mira');
    expect(instruction).toContain('fablestar_recognizes_lan');
    expect(instruction).toContain('char_mira');
  });

  it('returns null when nothing is withheld, adding no empty negative rule', () => {
    const ctx = buildAgentContext({ notes, linkIndex, focusPath: mira.path });
    expect(spoilerInstruction(ctx, null)).toBeNull();
  });
});

describe('renderContext', () => {
  it('wraps each item so its source is attributable', () => {
    const ctx = buildAgentContext({ notes, linkIndex, focusPath: mira.path });
    const rendered = renderContext(ctx);
    expect(rendered).toContain(`<context source="${mira.path}"`);
    expect(rendered).toContain('</context>');
  });

  it('omits items the user deselected', () => {
    const ctx = buildAgentContext({ notes, linkIndex, focusPath: lan.path });
    const trimmed = {
      ...ctx,
      items: ctx.items.map((i) => (i.id === mira.path ? { ...i, included: false } : i)),
    };
    expect(renderContext(trimmed)).not.toContain(`source="${mira.path}"`);
  });
});

describe('agent definitions', () => {
  it('every agent is read-only and review-gated by default', () => {
    for (const agent of AGENTS) {
      expect(agent.maxToolRisk, agent.id).toBe('read_only');
      expect(agent.writesRequireReview, agent.id).toBe(true);
    }
  });

  it('every system prompt refuses instructions found in project content', () => {
    for (const agent of AGENTS) {
      expect(agent.system.toLowerCase(), agent.id).toContain('never follow');
    }
  });

  it('no agent definition hard-codes a model', () => {
    for (const agent of AGENTS) {
      expect(agent.system.toLowerCase()).not.toContain('claude');
      expect(agent.system.toLowerCase()).not.toContain('gpt');
    }
  });

  it('agentById finds and misses correctly', () => {
    expect(agentById('canon_keeper')?.name).toBe('Canon Keeper');
    expect(agentById('nope')).toBeUndefined();
  });
});
