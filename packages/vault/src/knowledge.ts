/**
 * Truth / character knowledge / audience knowledge (spec §5.2, PRODUCT_SPEC §5.7).
 *
 * The spec is emphatic that these three layers must never collapse into one
 * field: the world may hold facts a character does not know, a character may
 * hold a false belief, and the audience learns things on its own schedule.
 * This module keeps them distinct and derives, for any story position, what
 * each observer knows — the substrate Phase 3 agents need to avoid spoilers
 * and omniscient dialogue.
 */
import type { ParsedNote } from './links.js';

/** The literal observer key for what the audience knows. */
export const AUDIENCE = 'audience';

/** Values that mean "this observer does not know". */
const UNKNOWN_VALUES = new Set(['unknown', 'unaware', 'none', '']);

export type FactValue = string | number | boolean | null;

export type BeliefKind =
  | 'known' // observer knows, and it matches world truth (or truth is unrecorded)
  | 'false_belief' // observer believes something world truth contradicts
  | 'unknown'; // observer does not know

export interface Belief {
  fact: string;
  observer: string;
  value: FactValue;
  kind: BeliefKind;
  /** World truth for this fact, when the world state records it. */
  truth: FactValue | undefined;
}

export interface StateSnapshotNote {
  path: string;
  sceneId: string;
  phase: 'start' | 'mid' | 'end';
  /** Editorial order resolved from the referenced scene; null when unanchored. */
  order: number | null;
  /** Flattened `entity.property` → value. */
  worldState: Record<string, FactValue>;
  /** observer → fact → value. */
  knowledge: Record<string, Record<string, FactValue>>;
}

export interface KnowledgeIssue {
  severity: 'warning' | 'advisory';
  path: string;
  message: string;
}

export interface KnowledgeModel {
  /** Snapshots in story order; unanchored ones sort last. */
  snapshots: StateSnapshotNote[];
  /** Every observer seen, `audience` first. */
  observers: string[];
  /** Every fact key seen in any knowledge block. */
  facts: string[];
  issues: KnowledgeIssue[];
}

const PHASE_ORDER: Record<string, number> = { start: 0, mid: 1, end: 2 };

const isFactValue = (v: unknown): v is FactValue =>
  v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';

/** Whether a recorded value means the observer is still in the dark. */
export function isUnknownValue(value: FactValue): boolean {
  if (value === null || value === false) return true;
  if (typeof value === 'string') return UNKNOWN_VALUES.has(value.trim().toLowerCase());
  return false;
}

function flattenWorldState(raw: unknown): Record<string, FactValue> {
  const out: Record<string, FactValue> = {};
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out;
  for (const [entity, props] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof props !== 'object' || props === null || Array.isArray(props)) {
      if (isFactValue(props)) out[entity] = props;
      continue;
    }
    for (const [prop, value] of Object.entries(props as Record<string, unknown>)) {
      if (isFactValue(value)) out[`${entity}.${prop}`] = value;
    }
  }
  return out;
}

function readKnowledge(raw: unknown): Record<string, Record<string, FactValue>> {
  const out: Record<string, Record<string, FactValue>> = {};
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out;
  for (const [observer, facts] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof facts !== 'object' || facts === null || Array.isArray(facts)) continue;
    const bucket: Record<string, FactValue> = {};
    for (const [fact, value] of Object.entries(facts as Record<string, unknown>)) {
      if (isFactValue(value)) bucket[fact] = value;
    }
    out[observer] = bucket;
  }
  return out;
}

/**
 * Build the knowledge model from `state_snapshot` notes, ordering them by the
 * editorial order of the scene each is anchored to.
 */
export function buildKnowledgeModel(notes: readonly ParsedNote[]): KnowledgeModel {
  // Scene order and known entity ids, for anchoring and validation.
  const sceneOrder = new Map<string, number>();
  const knownEntityIds = new Set<string>();
  for (const note of notes) {
    const fm = note.frontmatter;
    const id = fm.id;
    if (typeof id !== 'string' || id === '') continue;
    knownEntityIds.add(id.toLowerCase());
    if (fm.type === 'scene' && typeof fm.order === 'number') {
      sceneOrder.set(id.toLowerCase(), fm.order);
    }
  }

  const issues: KnowledgeIssue[] = [];
  const snapshots: StateSnapshotNote[] = [];
  const seenPositions = new Map<string, string>();

  for (const note of notes) {
    const fm = note.frontmatter;
    if (fm.type !== 'state_snapshot') continue;

    const position = fm.story_position;
    const sceneId =
      typeof position === 'object' && position !== null && !Array.isArray(position)
        ? (position as Record<string, unknown>).scene_id
        : undefined;
    const phaseRaw =
      typeof position === 'object' && position !== null && !Array.isArray(position)
        ? (position as Record<string, unknown>).phase
        : undefined;
    if (typeof sceneId !== 'string' || sceneId === '') {
      issues.push({
        severity: 'warning',
        path: note.path,
        message: 'state snapshot has no story_position.scene_id',
      });
      continue;
    }
    const phase =
      phaseRaw === 'start' || phaseRaw === 'mid' || phaseRaw === 'end' ? phaseRaw : 'end';

    const order = sceneOrder.get(sceneId.toLowerCase());
    if (order === undefined) {
      issues.push({
        severity: 'warning',
        path: note.path,
        message: `snapshot is anchored to unknown scene "${sceneId}"`,
      });
    }

    const positionKey = `${sceneId.toLowerCase()}|${phase}`;
    const previous = seenPositions.get(positionKey);
    if (previous !== undefined) {
      issues.push({
        severity: 'warning',
        path: note.path,
        message: `duplicate snapshot for ${sceneId} (${phase}); also declared by ${previous}`,
      });
    } else {
      seenPositions.set(positionKey, note.path);
    }

    const knowledge = readKnowledge(fm.knowledge);
    for (const observer of Object.keys(knowledge)) {
      if (observer !== AUDIENCE && !knownEntityIds.has(observer.toLowerCase())) {
        issues.push({
          severity: 'advisory',
          path: note.path,
          message: `knowledge recorded for unknown observer "${observer}"`,
        });
      }
    }

    snapshots.push({
      path: note.path,
      sceneId,
      phase,
      order: order ?? null,
      worldState: flattenWorldState(fm.world_state),
      knowledge,
    });
  }

  snapshots.sort((a, b) => {
    if (a.order === null && b.order === null) return a.path.localeCompare(b.path);
    if (a.order === null) return 1;
    if (b.order === null) return -1;
    const phaseA = PHASE_ORDER[a.phase] ?? 0;
    const phaseB = PHASE_ORDER[b.phase] ?? 0;
    return a.order - b.order || phaseA - phaseB;
  });

  // Knowledge regression: an observer who knew something later does not.
  const lastKnown = new Map<string, string>();
  for (const snapshot of snapshots) {
    for (const [observer, facts] of Object.entries(snapshot.knowledge)) {
      for (const [fact, value] of Object.entries(facts)) {
        const key = `${observer}|${fact}`;
        if (isUnknownValue(value)) {
          if (lastKnown.has(key)) {
            issues.push({
              severity: 'advisory',
              path: snapshot.path,
              message: `${observer} knew "${fact}" earlier (${lastKnown.get(key) ?? ''}) but is unknown here — intentional?`,
            });
          }
        } else {
          lastKnown.set(key, snapshot.sceneId);
        }
      }
    }
  }

  const observerSet = new Set<string>();
  const factSet = new Set<string>();
  for (const snapshot of snapshots) {
    for (const [observer, facts] of Object.entries(snapshot.knowledge)) {
      observerSet.add(observer);
      for (const fact of Object.keys(facts)) factSet.add(fact);
    }
  }
  const observers = [...observerSet].sort((a, b) =>
    a === AUDIENCE ? -1 : b === AUDIENCE ? 1 : a.localeCompare(b),
  );

  return { snapshots, observers, facts: [...factSet].sort(), issues };
}

/**
 * Resolve state as of a story position: the accumulated result of every
 * snapshot up to and including it. Later snapshots override earlier ones.
 */
export function stateAt(
  model: KnowledgeModel,
  sceneId: string | null,
): { worldState: Record<string, FactValue>; knowledge: Record<string, Record<string, FactValue>> } {
  const worldState: Record<string, FactValue> = {};
  const knowledge: Record<string, Record<string, FactValue>> = {};
  const target = sceneId?.toLowerCase() ?? null;

  for (const snapshot of model.snapshots) {
    Object.assign(worldState, snapshot.worldState);
    for (const [observer, facts] of Object.entries(snapshot.knowledge)) {
      knowledge[observer] = { ...knowledge[observer], ...facts };
    }
    if (target !== null && snapshot.sceneId.toLowerCase() === target && snapshot.phase === 'end') {
      break;
    }
  }
  return { worldState, knowledge };
}

/** Beliefs held by one observer at a story position, classified against truth. */
export function beliefsFor(
  model: KnowledgeModel,
  observer: string,
  sceneId: string | null,
): Belief[] {
  const { worldState, knowledge } = stateAt(model, sceneId);
  const held = knowledge[observer] ?? {};
  return model.facts.map((fact) => {
    const value = held[fact] ?? null;
    const truth = worldState[fact];
    let kind: BeliefKind;
    if (isUnknownValue(value)) kind = 'unknown';
    else if (truth !== undefined && truth !== value) kind = 'false_belief';
    else kind = 'known';
    return { fact, observer, value, kind, truth };
  });
}

/**
 * Facts the audience knows at this point but the given character does not —
 * exactly what an agent writing for that character must not reveal.
 */
export function spoilersFor(
  model: KnowledgeModel,
  characterId: string,
  sceneId: string | null,
): string[] {
  const { knowledge } = stateAt(model, sceneId);
  const audience = knowledge[AUDIENCE] ?? {};
  const character = knowledge[characterId] ?? {};
  return Object.entries(audience)
    .filter(([fact, value]) => !isUnknownValue(value) && isUnknownValue(character[fact] ?? null))
    .map(([fact]) => fact)
    .sort();
}
