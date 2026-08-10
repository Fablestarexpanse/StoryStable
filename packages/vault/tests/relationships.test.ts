import { describe, expect, it } from 'vitest';
import { parseNote } from '../src/links.js';
import { buildRelationshipIndex, inverseRelation } from '../src/relationships.js';

const note = (path: string, fm: string) => parseNote({ path, source: `---\n${fm}\n---\nBody` });

describe('inverseRelation', () => {
  it('maps symmetric relations to themselves', () => {
    expect(inverseRelation('allied_with')).toBe('allied_with');
    expect(inverseRelation('knows')).toBe('knows');
  });

  it('maps asymmetric relations to their counterpart', () => {
    expect(inverseRelation('parent_of')).toBe('child_of');
    expect(inverseRelation('member_of')).toBe('has_member');
    expect(inverseRelation('located_in')).toBe('contains');
  });

  it('returns undefined for custom relations', () => {
    expect(inverseRelation('haunted_by')).toBeUndefined();
  });
});

describe('buildRelationshipIndex', () => {
  const lan = note(
    'World/Characters/Lan.md',
    'title: Lan\nid: char_lan\nrelationships:\n  - target_id: char_mira\n    relation: allied_with\n  - target_id: fac_wardens\n    relation: enemy_of\n    status: rumored',
  );
  const mira = note(
    'World/Characters/Mira.md',
    'title: Mira\nid: char_mira\nrelationships:\n  - target_id: char_lan\n    relation: allied_with',
  );
  const wardens = note('World/Factions/Wardens.md', 'title: Wardens\nid: fac_wardens');
  const index = buildRelationshipIndex([lan, mira, wardens]);

  it('resolves targets by frontmatter id', () => {
    const allied = index.all.find((r) => r.relation === 'allied_with' && r.fromPath === lan.path);
    expect(allied?.toPath).toBe('World/Characters/Mira.md');
  });

  it('resolves targets by title when no id matches', () => {
    const byTitle = note(
      'World/Characters/Kes.md',
      'title: Kes\nrelationships:\n  - target_id: Wardens\n    relation: member_of',
    );
    const idx = buildRelationshipIndex([byTitle, wardens]);
    expect(idx.all[0]?.toPath).toBe('World/Factions/Wardens.md');
  });

  it('defaults status to current', () => {
    expect(index.all[0]?.status).toBe('current');
  });

  it('records unresolved targets', () => {
    const orphan = note(
      'World/Characters/Zed.md',
      'title: Zed\nrelationships:\n  - target_id: char_nobody\n    relation: knows',
    );
    const idx = buildRelationshipIndex([orphan]);
    expect(idx.unresolved).toHaveLength(1);
    expect(idx.unresolved[0]?.targetId).toBe('char_nobody');
  });

  it('does not flag reciprocated symmetric relations', () => {
    const oneSided = index.missingReciprocal.filter(
      (m) => m.relationship.relation === 'allied_with',
    );
    expect(oneSided).toHaveLength(0);
  });

  it('flags a missing symmetric counterpart', () => {
    const a = note(
      'a.md',
      'title: A\nid: a\nrelationships:\n  - target_id: b\n    relation: allied_with',
    );
    const b = note('b.md', 'title: B\nid: b');
    const idx = buildRelationshipIndex([a, b]);
    expect(idx.missingReciprocal).toHaveLength(1);
    expect(idx.missingReciprocal[0]?.expected).toBe('allied_with');
  });

  it('flags a missing inverse for asymmetric relations', () => {
    const parent = note(
      'p.md',
      'title: P\nid: p\nrelationships:\n  - target_id: c\n    relation: parent_of',
    );
    const child = note('c.md', 'title: C\nid: c');
    const idx = buildRelationshipIndex([parent, child]);
    expect(idx.missingReciprocal[0]?.expected).toBe('child_of');
  });

  it('never requires reciprocity for rumored relations', () => {
    const rumored = index.missingReciprocal.filter((m) => m.relationship.status === 'rumored');
    expect(rumored).toHaveLength(0);
  });

  it('never requires reciprocity for custom relations', () => {
    const a = note(
      'a.md',
      'title: A\nid: a\nrelationships:\n  - target_id: b\n    relation: haunted_by',
    );
    const b = note('b.md', 'title: B\nid: b');
    expect(buildRelationshipIndex([a, b]).missingReciprocal).toHaveLength(0);
  });

  it('indexes by source and target', () => {
    expect(index.byPath.get(lan.path)).toHaveLength(2);
    expect(index.incoming.get('World/Characters/Mira.md')).toHaveLength(1);
  });

  it('ignores malformed relationship entries without throwing', () => {
    const messy = note(
      'm.md',
      'title: M\nrelationships:\n  - "just a string"\n  - target_id: 42\n  - relation: knows',
    );
    expect(buildRelationshipIndex([messy]).all).toHaveLength(0);
  });

  it('ignores a non-array relationships field', () => {
    const bad = note('b.md', 'title: B\nrelationships: nope');
    expect(buildRelationshipIndex([bad]).all).toHaveLength(0);
  });
});
