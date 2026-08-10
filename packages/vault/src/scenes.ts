/**
 * Scene Capsules (spec §6.3).
 *
 * A Scene Capsule is the production/state layer *around* a screenplay scene,
 * not a replacement for it: the screenplay stays the prose, the capsule
 * carries purpose, state change, reveals, and continuity. Keeping them
 * separate is what lets the screenplay remain plain Fountain while the
 * production model stays queryable.
 */
import type { ParsedNote } from './links.js';
import type { SceneSummary, Screenplay } from './fountain.js';
import { sceneSummaries } from './fountain.js';
import { formatValue } from './properties.js';

export interface SceneLink {
  /** Scene as it appears in the screenplay, when there is one. */
  scene: SceneSummary | null;
  /** The capsule note, when one exists. */
  capsule: ParsedNote | null;
}

export interface StoryDiagnostic {
  severity: 'warning' | 'advisory';
  category: string;
  /** Capsule path when the finding is about a note, else null. */
  path: string | null;
  /** Scene heading the finding concerns, when applicable. */
  heading: string | null;
  message: string;
}

const lower = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

/** Capsule notes are `type: scene` frontmatter objects. */
export function sceneCapsules(notes: readonly ParsedNote[]): ParsedNote[] {
  return notes.filter((n) => n.frontmatter.type === 'scene');
}

/**
 * Pair screenplay scenes with their capsules.
 *
 * A capsule claims a scene by `scene_number`, by an explicit `heading`, or —
 * as a convenience for hand-authored capsules — by its own title matching the
 * heading. Unmatched items on both sides are returned rather than dropped, so
 * the UI can offer to reconcile them.
 */
export function linkScenes(screenplay: Screenplay, notes: readonly ParsedNote[]): SceneLink[] {
  const scenes = sceneSummaries(screenplay);
  const capsules = sceneCapsules(notes);
  const claimed = new Set<string>();

  const links: SceneLink[] = scenes.map((scene) => {
    const match = capsules.find((capsule) => {
      if (claimed.has(capsule.path)) return false;
      const fm = capsule.frontmatter;
      if (
        scene.sceneNumber !== null &&
        lower(fm.scene_number) === scene.sceneNumber.toLowerCase()
      ) {
        return true;
      }
      if (lower(fm.heading) === scene.heading.toLowerCase()) return true;
      return capsule.title.toLowerCase() === scene.heading.toLowerCase();
    });
    if (match) claimed.add(match.path);
    return { scene, capsule: match ?? null };
  });

  // Capsules that claim no scene still belong in the list — a scene may have
  // been renamed or cut, and silently hiding the capsule would lose work.
  for (const capsule of capsules) {
    if (!claimed.has(capsule.path)) links.push({ scene: null, capsule });
  }
  return links;
}

/**
 * Story diagnostics (spec §6.8). Every finding is a warning or advisory —
 * never a hard gate, because an unfinished scene is a normal state of work.
 */
export function storyDiagnostics(
  screenplay: Screenplay,
  notes: readonly ParsedNote[],
): StoryDiagnostic[] {
  const findings: StoryDiagnostic[] = [];
  const links = linkScenes(screenplay, notes);

  // A character id resolves through frontmatter id or note title.
  const idByName = new Map<string, string>();
  for (const note of notes) {
    const id = note.frontmatter.id;
    if (typeof id !== 'string' || id === '') continue;
    idByName.set(note.title.toLowerCase(), id);
    idByName.set(id.toLowerCase(), id);
  }

  for (const { scene, capsule } of links) {
    if (scene && !capsule) {
      findings.push({
        severity: 'advisory',
        category: 'no-capsule',
        path: null,
        heading: scene.heading,
        message: 'scene has no Scene Capsule, so its state change is untracked',
      });
      continue;
    }
    if (!scene && capsule) {
      findings.push({
        severity: 'warning',
        category: 'orphan-capsule',
        path: capsule.path,
        heading: null,
        message: 'capsule matches no scene in the screenplay — was the scene renamed or cut?',
      });
      continue;
    }
    if (!scene || !capsule) continue;

    const fm = capsule.frontmatter;

    // Spec §6.8: "scene has no state change".
    const start = fm.start_state_id;
    const end = fm.end_state_id;
    const hasStart = typeof start === 'string' && start !== '';
    const hasEnd = typeof end === 'string' && end !== '';
    if (!hasStart && !hasEnd) {
      findings.push({
        severity: 'advisory',
        category: 'no-state-change',
        path: capsule.path,
        heading: scene.heading,
        message: 'no start or end state recorded — what changes in this scene?',
      });
    } else if (hasStart && hasEnd && start === end) {
      findings.push({
        severity: 'warning',
        category: 'no-state-change',
        path: capsule.path,
        heading: scene.heading,
        message: 'start and end state are the same, so nothing changes here',
      });
    }

    // A character who speaks but is not listed is a continuity gap, and it is
    // the kind of thing that silently breaks downstream context assembly.
    const listed = new Set(stringList(fm.character_ids).map((c) => c.toLowerCase()));
    for (const speaker of scene.characters) {
      const resolved = idByName.get(speaker.toLowerCase());
      const present =
        listed.has(speaker.toLowerCase()) ||
        (resolved !== undefined && listed.has(resolved.toLowerCase()));
      if (!present) {
        findings.push({
          severity: 'warning',
          category: 'unlisted-speaker',
          path: capsule.path,
          heading: scene.heading,
          message: `${speaker} speaks in this scene but is not in character_ids`,
        });
      }
    }

    if (formatValue(fm.intent).trim() === '') {
      findings.push({
        severity: 'advisory',
        category: 'no-intent',
        path: capsule.path,
        heading: scene.heading,
        message: 'no intent recorded — what is this scene for?',
      });
    }
  }

  const order: Record<StoryDiagnostic['severity'], number> = { warning: 0, advisory: 1 };
  return findings.sort(
    (a, b) =>
      order[a.severity] - order[b.severity] || (a.heading ?? '').localeCompare(b.heading ?? ''),
  );
}

/**
 * Build a Scene Capsule note for a screenplay scene. `now` is injected so
 * callers stay deterministic.
 */
export function createSceneCapsule(
  scene: SceneSummary,
  order: number,
  now: string,
  characterIds: readonly string[] = [],
): { path: string; source: string } {
  const slug = (scene.sceneNumber ?? String(order).padStart(3, '0')).replace(/[^\w-]/g, '');
  const id = `scene_${slug.toLowerCase()}`;
  const characters = characterIds.length > 0 ? characterIds : scene.characters;

  const frontmatter = [
    '---',
    'schema_version: 1',
    `id: ${id}`,
    'type: scene',
    `title: ${JSON.stringify(scene.heading)}`,
    `heading: ${JSON.stringify(scene.heading)}`,
    ...(scene.sceneNumber !== null ? [`scene_number: ${JSON.stringify(scene.sceneNumber)}`] : []),
    `order: ${String(order)}`,
    'status: drafting',
    `created_at: ${now}`,
    `character_ids: [${characters.join(', ')}]`,
    'location_ids: []',
    'intent: ""',
    'start_state_id: null',
    'end_state_id: null',
    'protected_information: []',
    'moment_ids: []',
    '---',
  ].join('\n');

  const body = [
    '',
    `# ${scene.heading}`,
    '',
    '## Purpose',
    '',
    '',
    '## Starting state',
    '',
    '',
    '## Ending state',
    '',
    '',
    '## Information revealed',
    '',
    '',
    '## Continuity',
    '',
    '',
  ].join('\n');

  return { path: `Story/Scenes/${slug}.md`, source: frontmatter + body };
}
