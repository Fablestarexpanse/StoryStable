/**
 * World timeline (spec §5.5) — chronological world time, separate from
 * editorial time.
 *
 * Invented calendars are the norm in worldbuilding, so dates are parsed
 * leniently: plain year numbers, ISO dates, ranges, and uncertainty markers
 * all work, and anything unrecognized is kept as an unordered label rather
 * than discarded.
 */
import type { ParsedNote } from './links.js';

export interface WorldDate {
  /** Numeric sort key on a year scale, or null when unorderable. */
  sort: number | null;
  /** Text exactly as authored. */
  display: string;
  /** Marked approximate ("c. 412", "~412", "412?"). */
  uncertain: boolean;
}

export interface TimelineEvent {
  path: string;
  title: string;
  kind: 'event' | 'span';
  start: WorldDate;
  /** Present for spans (lifespans, faction periods, ranges). */
  end: WorldDate | null;
  era: string | null;
  /** Entity paths this event involves. */
  participants: string[];
}

export interface TimelineConflict {
  severity: 'warning' | 'advisory';
  path: string;
  message: string;
}

export interface Timeline {
  entries: TimelineEvent[];
  /** Entries with no orderable date, kept visible rather than dropped. */
  undated: TimelineEvent[];
  conflicts: TimelineConflict[];
  eras: string[];
}

// Longest alternatives first, and the marker must be followed by a number,
// so "circa"/"ca" are not shortened to "c" and a title like "Cold War" is
// never mistaken for an approximate date.
const UNCERTAIN = /^\s*(?:(?:circa|approx|about|ca|c)\.?\s*|~\s*)(?=[-\d])/i;

/**
 * Parse a fictional-or-real world date into an orderable key.
 * ISO dates map onto the same year scale as bare years (2026-07-01 ≈ 2026.5)
 * so mixed vaults still sort sensibly.
 */
export function parseWorldDate(input: unknown): WorldDate {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return { sort: input, display: String(input), uncertain: false };
  }
  if (typeof input !== 'string') return { sort: null, display: '', uncertain: false };

  const display = input.trim();
  if (display === '') return { sort: null, display: '', uncertain: false };

  let working = display;
  let uncertain = false;
  if (UNCERTAIN.test(working)) {
    uncertain = true;
    working = working.replace(UNCERTAIN, '');
  }
  if (working.endsWith('?')) {
    uncertain = true;
    working = working.slice(0, -1).trim();
  }

  // ISO-ish: YYYY-MM-DD or YYYY-MM
  const iso = /^(-?\d{1,6})-(\d{2})(?:-(\d{2}))?$/.exec(working);
  if (iso?.[1] !== undefined && iso[2] !== undefined) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = iso[3] === undefined ? 1 : Number(iso[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const fraction = (month - 1) / 12 + (day - 1) / 372;
      return { sort: year + fraction, display, uncertain };
    }
  }

  // Bare (possibly negative/BC-style) year, optionally with an era suffix.
  const yearMatch = /^(-?\d+(?:\.\d+)?)\s*(.*)$/.exec(working);
  if (yearMatch?.[1] !== undefined) {
    const value = Number(yearMatch[1]);
    if (Number.isFinite(value)) {
      const suffix = (yearMatch[2] ?? '').toLowerCase();
      const negate = suffix.startsWith('bc') || suffix.startsWith('bce');
      return { sort: negate ? -value : value, display, uncertain };
    }
  }

  return { sort: null, display, uncertain };
}

/** Split a range like "412–418" or "412 - 418" into its endpoints. */
export function parseDateRange(input: unknown): { start: WorldDate; end: WorldDate | null } {
  if (typeof input === 'string') {
    const range = /^(.*?)\s*(?:–|—|-{1,2}|\bto\b)\s*(.+)$/.exec(input.trim());
    // Guard against negative years being read as a range ("-500").
    if (range?.[1] !== undefined && range[1].trim() !== '' && range[2] !== undefined) {
      return { start: parseWorldDate(range[1]), end: parseWorldDate(range[2]) };
    }
  }
  return { start: parseWorldDate(input), end: null };
}

const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

function participantsOf(note: ParsedNote, byName: Map<string, string>): string[] {
  const out = new Set<string>();
  const ids = note.frontmatter.character_ids;
  if (Array.isArray(ids)) {
    for (const id of ids) {
      if (typeof id !== 'string') continue;
      const path = byName.get(id.toLowerCase());
      if (path !== undefined) out.add(path);
    }
  }
  for (const link of note.links) {
    if (link.target === '') continue;
    const path = byName.get(link.target.toLowerCase());
    if (path !== undefined) out.add(path);
  }
  return [...out];
}

/**
 * Build the world timeline from note frontmatter.
 *
 * Recognized fields: `date` (event), `start_date`/`end_date`,
 * `born`/`died` (character lifespan), `founded`/`dissolved` (faction period),
 * and `era`.
 */
export function buildTimeline(notes: readonly ParsedNote[]): Timeline {
  const byName = new Map<string, string>();
  for (const note of notes) {
    const id = note.frontmatter.id;
    if (typeof id === 'string' && id !== '') byName.set(id.toLowerCase(), note.path);
    byName.set(note.title.toLowerCase(), note.path);
    byName.set(note.stem.toLowerCase(), note.path);
  }

  const all: TimelineEvent[] = [];
  const conflicts: TimelineConflict[] = [];
  const eras = new Set<string>();
  const lifespans = new Map<string, { start: WorldDate; end: WorldDate | null; title: string }>();

  for (const note of notes) {
    const fm = note.frontmatter;
    const era = str(fm.era);
    if (era !== null) eras.add(era);

    const spanStart = fm.born ?? fm.founded ?? fm.start_date;
    const spanEnd = fm.died ?? fm.dissolved ?? fm.end_date;
    const hasSpan = spanStart !== undefined || spanEnd !== undefined;

    if (hasSpan) {
      const start = parseWorldDate(spanStart);
      const end = spanEnd === undefined ? null : parseWorldDate(spanEnd);
      const entry: TimelineEvent = {
        path: note.path,
        title: note.title,
        kind: 'span',
        start,
        end,
        era,
        participants: [],
      };
      all.push(entry);
      lifespans.set(note.path, { start, end, title: note.title });

      if (start.sort !== null && end?.sort != null && end.sort < start.sort) {
        conflicts.push({
          severity: 'warning',
          path: note.path,
          message: `span ends (${end.display}) before it starts (${start.display})`,
        });
      }
    }

    if (fm.date !== undefined) {
      const { start, end } = parseDateRange(fm.date);
      all.push({
        path: note.path,
        title: note.title,
        kind: end === null ? 'event' : 'span',
        start,
        end,
        era,
        participants: participantsOf(note, byName),
      });
    }
  }

  // Chronology conflicts: an event involving a character outside their life.
  for (const entry of all) {
    if (entry.start.sort === null) continue;
    for (const participant of entry.participants) {
      const life = lifespans.get(participant);
      if (!life) continue;
      if (life.start.sort !== null && entry.start.sort < life.start.sort) {
        conflicts.push({
          severity: life.start.uncertain ? 'advisory' : 'warning',
          path: entry.path,
          message: `${life.title} appears in "${entry.title}" (${entry.start.display}) before their start date (${life.start.display})`,
        });
      }
      if (life.end?.sort != null && entry.start.sort > life.end.sort) {
        conflicts.push({
          severity: life.end.uncertain ? 'advisory' : 'warning',
          path: entry.path,
          message: `${life.title} appears in "${entry.title}" (${entry.start.display}) after their end date (${life.end.display})`,
        });
      }
    }
  }

  const dated = all
    .filter((e) => e.start.sort !== null)
    .sort((a, b) => (a.start.sort ?? 0) - (b.start.sort ?? 0) || a.title.localeCompare(b.title));
  const undated = all
    .filter((e) => e.start.sort === null)
    .sort((a, b) => a.title.localeCompare(b.title));

  return { entries: dated, undated, conflicts, eras: [...eras].sort() };
}
