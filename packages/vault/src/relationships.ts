/**
 * Typed, directional relationships (spec §5.6).
 *
 * Relationships live in note frontmatter as
 * `relationships: [{ target_id, relation, status }]`. They are a structured
 * layer *alongside* wikilinks, not a replacement: a relationship may exist
 * without prose linking, and vice versa.
 */
import type { ParsedNote } from './links.js';

export const RELATION_TYPES = [
  'knows',
  'allied_with',
  'enemy_of',
  'located_in',
  'member_of',
  'owns',
  'created_by',
  'parent_of',
  'reports_to',
] as const;

export type RelationType = (typeof RELATION_TYPES)[number] | (string & {});

export type RelationStatus = 'current' | 'past' | 'rumored';

/** Relations that imply the same relation back. */
const SYMMETRIC = new Set(['knows', 'allied_with', 'enemy_of']);

/** Asymmetric relations and the relation they imply on the target. */
const INVERSE: Readonly<Record<string, string>> = {
  parent_of: 'child_of',
  child_of: 'parent_of',
  owns: 'owned_by',
  owned_by: 'owns',
  member_of: 'has_member',
  has_member: 'member_of',
  reports_to: 'manages',
  manages: 'reports_to',
  created_by: 'created',
  created: 'created_by',
  located_in: 'contains',
  contains: 'located_in',
};

export interface Relationship {
  /** Path of the note declaring the relationship. */
  fromPath: string;
  /** Resolved path of the target note, or null when unresolved. */
  toPath: string | null;
  /** The `target_id` as written. */
  targetId: string;
  relation: RelationType;
  status: RelationStatus;
  notes?: string;
}

export interface RelationshipIndex {
  all: Relationship[];
  /** Relationships whose target_id matched no note. */
  unresolved: Relationship[];
  /** Declared relationships whose implied counterpart is missing. */
  missingReciprocal: { relationship: Relationship; expected: string }[];
  /** path -> relationships declared by that note. */
  byPath: Map<string, Relationship[]>;
  /** path -> relationships pointing at that note. */
  incoming: Map<string, Relationship[]>;
}

const isStatus = (v: unknown): v is RelationStatus =>
  v === 'current' || v === 'past' || v === 'rumored';

/**
 * Build the relationship index. Targets resolve by frontmatter `id` first,
 * then by note title/stem, so both `char_lan` and `Lan` work.
 */
export function buildRelationshipIndex(notes: readonly ParsedNote[]): RelationshipIndex {
  const byId = new Map<string, ParsedNote>();
  const byName = new Map<string, ParsedNote>();
  for (const note of notes) {
    const id = note.frontmatter.id;
    if (typeof id === 'string' && id !== '') byId.set(id.toLowerCase(), note);
    byName.set(note.title.toLowerCase(), note);
    byName.set(note.stem.toLowerCase(), note);
  }

  const all: Relationship[] = [];
  for (const note of notes) {
    const raw = note.frontmatter.relationships;
    if (!Array.isArray(raw)) continue;
    for (const entry of raw) {
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) continue;
      const record = entry as Record<string, unknown>;
      const targetId = record.target_id;
      const relation = record.relation;
      if (typeof targetId !== 'string' || typeof relation !== 'string') continue;
      const key = targetId.toLowerCase();
      const target = byId.get(key) ?? byName.get(key);
      const rel: Relationship = {
        fromPath: note.path,
        toPath: target?.path ?? null,
        targetId,
        relation,
        status: isStatus(record.status) ? record.status : 'current',
        ...(typeof record.notes === 'string' ? { notes: record.notes } : {}),
      };
      all.push(rel);
    }
  }

  const byPath = new Map<string, Relationship[]>();
  const incoming = new Map<string, Relationship[]>();
  const push = (map: Map<string, Relationship[]>, key: string, rel: Relationship) => {
    const list = map.get(key);
    if (list) list.push(rel);
    else map.set(key, [rel]);
  };
  for (const rel of all) {
    push(byPath, rel.fromPath, rel);
    if (rel.toPath !== null) push(incoming, rel.toPath, rel);
  }

  // Reciprocity: a declared relation implies a counterpart on the target.
  // Rumored relations are one-sided by nature and never require one.
  const declared = new Set(all.map((r) => `${r.fromPath}|${r.toPath ?? ''}|${r.relation}`));
  const missingReciprocal: { relationship: Relationship; expected: string }[] = [];
  for (const rel of all) {
    if (rel.toPath === null || rel.status === 'rumored') continue;
    const expected = SYMMETRIC.has(rel.relation) ? rel.relation : INVERSE[rel.relation];
    if (expected === undefined) continue;
    if (!declared.has(`${rel.toPath}|${rel.fromPath}|${expected}`)) {
      missingReciprocal.push({ relationship: rel, expected });
    }
  }

  return {
    all,
    unresolved: all.filter((r) => r.toPath === null),
    missingReciprocal,
    byPath,
    incoming,
  };
}

/** Relation implied on the target, if this relation has one. */
export function inverseRelation(relation: string): string | undefined {
  return SYMMETRIC.has(relation) ? relation : INVERSE[relation];
}
