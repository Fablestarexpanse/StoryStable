import { describe, expect, it } from 'vitest';
import { parseNote } from '../src/links.js';
import { collectColumns, buildRows, groupRows, formatValue, rowsToCsv } from '../src/properties.js';

const note = (path: string, source: string) => parseNote({ path, source });

const notes = [
  note(
    'World/Characters/Lan.md',
    '---\ntitle: Lan\nentity_type: character\nstatus: canon\ntags: [pilot, protagonist]\n---\n',
  ),
  note(
    'World/Characters/Mira.md',
    '---\ntitle: Mira\nentity_type: character\nstatus: draft\ntags: [engineer]\n---\n',
  ),
  note('World/Locations/Ring.md', '---\ntitle: Ring\nentity_type: location\nstatus: canon\n---\n'),
];

describe('collectColumns', () => {
  it('ranks properties by how many notes define them', () => {
    const cols = collectColumns(notes);
    expect(cols[0]?.key).toBe('entity_type');
    expect(cols.find((c) => c.key === 'tags')?.count).toBe(2);
  });

  it('excludes title, which is always its own column', () => {
    expect(collectColumns(notes).map((c) => c.key)).not.toContain('title');
  });
});

describe('formatValue', () => {
  it('renders arrays, scalars and blanks', () => {
    expect(formatValue(['a', 'b'])).toBe('a, b');
    expect(formatValue(3)).toBe('3');
    expect(formatValue(null)).toBe('');
    expect(formatValue(undefined)).toBe('');
    expect(formatValue(true)).toBe('true');
  });
});

describe('buildRows', () => {
  it('sorts by path when no sort is given', () => {
    expect(buildRows(notes).map((r) => r.path)).toEqual([
      'World/Characters/Lan.md',
      'World/Characters/Mira.md',
      'World/Locations/Ring.md',
    ]);
  });

  it('filters on substring, case-insensitively', () => {
    const rows = buildRows(notes, { filters: { entity_type: 'CHAR' } });
    expect(rows.map((r) => r.title)).toEqual(['Lan', 'Mira']);
  });

  it('matches inside array values', () => {
    expect(buildRows(notes, { filters: { tags: 'engineer' } }).map((r) => r.title)).toEqual([
      'Mira',
    ]);
  });

  it('ignores empty filters', () => {
    expect(buildRows(notes, { filters: { status: '' } })).toHaveLength(3);
  });

  it('sorts ascending and descending by a property', () => {
    expect(buildRows(notes, { sortBy: 'status' }).map((r) => r.title)).toEqual([
      'Lan',
      'Ring',
      'Mira',
    ]);
    expect(buildRows(notes, { sortBy: 'title', sortDescending: true }).map((r) => r.title)).toEqual(
      ['Ring', 'Mira', 'Lan'],
    );
  });

  it('sorts notes missing the property last in both directions', () => {
    const asc = buildRows(notes, { sortBy: 'tags' }).map((r) => r.title);
    const desc = buildRows(notes, { sortBy: 'tags', sortDescending: true }).map((r) => r.title);
    expect(asc[asc.length - 1]).toBe('Ring');
    expect(desc[desc.length - 1]).toBe('Ring');
  });
});

describe('groupRows', () => {
  it('groups by a property', () => {
    const groups = groupRows(buildRows(notes), 'entity_type');
    expect(groups.map((g) => g.key)).toEqual(['character', 'location']);
    expect(groups[0]?.rows).toHaveLength(2);
  });

  it('puts missing values in a trailing "—" group', () => {
    const groups = groupRows(buildRows(notes), 'tags');
    expect(groups[groups.length - 1]?.key).toBe('—');
  });
});

describe('rowsToCsv', () => {
  it('emits a header and escapes commas and quotes', () => {
    const rows = buildRows(notes, { filters: { entity_type: 'character' } });
    const csv = rowsToCsv(rows, ['status', 'tags']);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('path,title,status,tags');
    expect(lines[1]).toBe('World/Characters/Lan.md,Lan,canon,"pilot, protagonist"');
  });

  it('escapes embedded quotes by doubling them', () => {
    const quoted = [note('a.md', '---\ntitle: He said "hi"\n---\n')];
    expect(rowsToCsv(buildRows(quoted), [])).toContain('"He said ""hi"""');
  });
});
