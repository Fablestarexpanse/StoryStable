import type { ParsedNote } from './links.js';

/** A frontmatter property surfaced as a column in a property view. */
export interface PropertyColumn {
  key: string;
  /** How many notes in the set define this property. */
  count: number;
}

export type PropertyValue = string | number | boolean | null | readonly unknown[];

export interface PropertyRow {
  path: string;
  title: string;
  values: Record<string, unknown>;
}

export interface PropertyViewOptions {
  /** Only include notes whose frontmatter matches every filter entry. */
  filters?: Readonly<Record<string, string>>;
  sortBy?: string;
  sortDescending?: boolean;
  /** Property to group rows by; missing values group under "—". */
  groupBy?: string;
}

export interface PropertyGroup {
  key: string;
  rows: PropertyRow[];
}

const BASE_KEYS = new Set(['title']);

/**
 * Collect the frontmatter keys present across a note set, most common first,
 * so a property table can offer sensible default columns.
 */
export function collectColumns(notes: readonly ParsedNote[]): PropertyColumn[] {
  const counts = new Map<string, number>();
  for (const note of notes) {
    for (const key of Object.keys(note.frontmatter)) {
      if (BASE_KEYS.has(key)) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

/** Display form of a frontmatter value. Arrays join with ", ". */
export function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.map((v) => formatValue(v)).join(', ');
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  // Objects and exotic values render as JSON rather than "[object Object]".
  return JSON.stringify(value);
}

/** Build rows for a property view, applying filters and sorting. */
export function buildRows(
  notes: readonly ParsedNote[],
  options: PropertyViewOptions = {},
): PropertyRow[] {
  const { filters = {}, sortBy, sortDescending = false } = options;
  const filterEntries = Object.entries(filters).filter(([, v]) => v !== '');

  const rows = notes
    .filter((note) =>
      filterEntries.every(([key, wanted]) =>
        formatValue(note.frontmatter[key]).toLowerCase().includes(wanted.toLowerCase()),
      ),
    )
    .map((note) => ({
      path: note.path,
      title: note.title,
      values: note.frontmatter,
    }));

  if (sortBy !== undefined) {
    rows.sort((a, b) => {
      const av = sortBy === 'title' ? a.title : formatValue(a.values[sortBy]);
      const bv = sortBy === 'title' ? b.title : formatValue(b.values[sortBy]);
      // Empty values always sort last regardless of direction.
      if (av === '' && bv !== '') return 1;
      if (bv === '' && av !== '') return -1;
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return sortDescending ? -cmp : cmp;
    });
  } else {
    rows.sort((a, b) => a.path.localeCompare(b.path));
  }
  return rows;
}

/** Group rows by a property; ungrouped values fall under "—". */
export function groupRows(rows: readonly PropertyRow[], groupBy: string): PropertyGroup[] {
  const groups = new Map<string, PropertyRow[]>();
  for (const row of rows) {
    const raw = groupBy === 'title' ? row.title : formatValue(row.values[groupBy]);
    const key = raw === '' ? '—' : raw;
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.entries()]
    .map(([key, groupRowsList]) => ({ key, rows: groupRowsList }))
    .sort((a, b) => (a.key === '—' ? 1 : b.key === '—' ? -1 : a.key.localeCompare(b.key)));
}

/** CSV export of a property view (spec §5.3: export CSV). */
export function rowsToCsv(rows: readonly PropertyRow[], columns: readonly string[]): string {
  const escape = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  const header = ['path', 'title', ...columns].map(escape).join(',');
  const lines = rows.map((row) =>
    [row.path, row.title, ...columns.map((c) => formatValue(row.values[c]))].map(escape).join(','),
  );
  return [header, ...lines].join('\n');
}
