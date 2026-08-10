import type { LinkIndex, ParsedNote } from './links.js';
import { buildRelationshipIndex } from './relationships.js';
import { buildTimeline } from './timeline.js';

export type HealthSeverity = 'error' | 'warning' | 'advisory';

export interface HealthFinding {
  severity: HealthSeverity;
  category: string;
  /** Note path the finding is about, when applicable. */
  path: string | null;
  message: string;
}

/**
 * Project health findings derivable from the vault alone (spec §9.3 subset).
 * Index-level checks (SQLite integrity, note counts) come from the Rust
 * side and are merged by the caller.
 */
export function computeHealth(
  notes: ParsedNote[],
  linkIndex: LinkIndex,
  /** Root-relative paths of non-Markdown vault files, for embed checking. */
  attachmentPaths: readonly string[] = [],
): HealthFinding[] {
  const findings: HealthFinding[] = [];

  // Embeds pointing at media that is not in the vault.
  if (attachmentPaths.length > 0 || notes.some((n) => n.links.some((l) => l.embed))) {
    const known = new Set<string>();
    for (const path of attachmentPaths) {
      known.add(path.toLowerCase());
      const stem = path.split('/').pop();
      if (stem !== undefined) known.add(stem.toLowerCase());
    }
    const noteNames = new Set<string>();
    for (const note of notes) {
      noteNames.add(note.path.toLowerCase());
      noteNames.add(note.stem.toLowerCase());
      noteNames.add(note.title.toLowerCase());
    }
    for (const note of notes) {
      for (const link of note.links) {
        if (!link.embed || link.target === '') continue;
        const target = link.target.toLowerCase();
        if (known.has(target) || noteNames.has(target)) continue;
        findings.push({
          severity: 'warning',
          category: 'missing-embed',
          path: note.path,
          message: `embedded file not found: ![[${link.target}]]`,
        });
      }
    }
  }

  for (const note of notes) {
    for (const error of note.frontmatterErrors) {
      findings.push({
        severity: 'error',
        category: 'frontmatter',
        path: note.path,
        message: error,
      });
    }
  }

  for (const { from, link } of linkIndex.unresolved) {
    // Heading-only links ([[#Section]]) are intra-note references, not broken.
    if (link.target === '') continue;
    // Embeds are reported by the missing-embed check above, not twice.
    if (link.embed) continue;
    findings.push({
      severity: 'warning',
      category: 'broken-link',
      path: from,
      message: `unresolved link [[${link.target}]]`,
    });
  }

  const linked = new Set<string>();
  for (const { from, to } of linkIndex.resolved) {
    linked.add(from);
    linked.add(to);
  }
  for (const note of notes) {
    if (!linked.has(note.path) && note.path !== 'README.md') {
      findings.push({
        severity: 'advisory',
        category: 'orphan',
        path: note.path,
        message: 'note has no inbound or outbound links',
      });
    }
  }

  // Duplicate stable IDs across frontmatter (spec: IDs must be unique).
  const byId = new Map<string, string[]>();
  for (const note of notes) {
    const id = note.frontmatter.id;
    if (typeof id !== 'string' || id.length === 0) continue;
    const paths = byId.get(id);
    if (paths) paths.push(note.path);
    else byId.set(id, [note.path]);
  }
  for (const [id, paths] of byId) {
    if (paths.length > 1) {
      findings.push({
        severity: 'error',
        category: 'duplicate-id',
        path: null,
        message: `id "${id}" used by ${paths.join(', ')}`,
      });
    }
  }

  // Relationship integrity (spec §5.6).
  const relationships = buildRelationshipIndex(notes);
  for (const rel of relationships.unresolved) {
    findings.push({
      severity: 'warning',
      category: 'broken-relationship',
      path: rel.fromPath,
      message: `relationship "${rel.relation}" points at unknown target "${rel.targetId}"`,
    });
  }
  for (const { relationship, expected } of relationships.missingReciprocal) {
    findings.push({
      severity: 'advisory',
      category: 'one-sided-relationship',
      path: relationship.fromPath,
      message: `declares "${relationship.relation}" toward ${relationship.targetId}, which does not declare "${expected}" back`,
    });
  }

  // Chronology conflicts (spec §5.5).
  for (const conflict of buildTimeline(notes).conflicts) {
    findings.push({
      severity: conflict.severity,
      category: 'chronology',
      path: conflict.path,
      message: conflict.message,
    });
  }

  const order: Record<HealthSeverity, number> = { error: 0, warning: 1, advisory: 2 };
  return findings.sort(
    (a, b) => order[a.severity] - order[b.severity] || (a.path ?? '').localeCompare(b.path ?? ''),
  );
}
