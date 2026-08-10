import { describe, expect, it } from 'vitest';
import { parseNote } from '../src/links.js';
import { buildTimeline, parseWorldDate, parseDateRange } from '../src/timeline.js';

const note = (path: string, fm: string, body = 'Body') =>
  parseNote({ path, source: `---\n${fm}\n---\n${body}` });

describe('parseWorldDate', () => {
  it('parses plain years, including invented calendars', () => {
    expect(parseWorldDate(412)).toMatchObject({ sort: 412, uncertain: false });
    expect(parseWorldDate('412')).toMatchObject({ sort: 412 });
    expect(parseWorldDate('412 of the Ascension')).toMatchObject({ sort: 412 });
  });

  it('places ISO dates on the same year scale as bare years', () => {
    const iso = parseWorldDate('2026-07-01');
    expect(iso.sort).toBeGreaterThan(2026);
    expect(iso.sort).toBeLessThan(2027);
    expect(parseWorldDate('2026-01-01').sort).toBeLessThan(parseWorldDate('2026-12-01').sort ?? 0);
  });

  it('detects uncertainty markers', () => {
    for (const input of ['c. 412', 'ca 412', '~412', 'circa 412', '412?']) {
      const parsed = parseWorldDate(input);
      expect(parsed.uncertain, input).toBe(true);
      expect(parsed.sort, input).toBe(412);
    }
  });

  it('handles BC-style suffixes and negative years', () => {
    expect(parseWorldDate('500 BC').sort).toBe(-500);
    expect(parseWorldDate('-500').sort).toBe(-500);
  });

  it('keeps unparseable dates as unordered labels rather than dropping them', () => {
    const parsed = parseWorldDate('the Long Winter');
    expect(parsed.sort).toBeNull();
    expect(parsed.display).toBe('the Long Winter');
  });

  it('preserves the authored text verbatim', () => {
    expect(parseWorldDate('  c. 412  ').display).toBe('c. 412');
  });
});

describe('parseDateRange', () => {
  it('splits en-dash, hyphen and "to" ranges', () => {
    for (const input of ['412–418', '412 - 418', '412 to 418']) {
      const { start, end } = parseDateRange(input);
      expect(start.sort, input).toBe(412);
      expect(end?.sort, input).toBe(418);
    }
  });

  it('does not mistake a negative year for a range', () => {
    const { start, end } = parseDateRange('-500');
    expect(start.sort).toBe(-500);
    expect(end).toBeNull();
  });

  it('returns a single date when there is no range', () => {
    expect(parseDateRange('412').end).toBeNull();
  });
});

describe('buildTimeline', () => {
  const lan = note('World/Characters/Lan.md', 'title: Lan\nid: char_lan\nborn: 380\ndied: 445');
  const wardens = note(
    'World/Factions/Wardens.md',
    'title: Wardens\nid: fac_wardens\nfounded: 300\ndissolved: 500',
  );
  const battle = note(
    'World/History/Battle.md',
    'title: Battle of the Ring\nentity_type: event\ndate: 412\nera: Ascension',
    'Fought by [[Lan]].',
  );
  const legend = note(
    'World/History/Legend.md',
    'title: Old Legend\nentity_type: event\ndate: the Long Winter',
  );

  const timeline = buildTimeline([lan, wardens, battle, legend]);

  it('orders dated entries chronologically', () => {
    expect(timeline.entries.map((e) => e.title)).toEqual(['Wardens', 'Lan', 'Battle of the Ring']);
  });

  it('keeps undated entries visible in a separate list', () => {
    expect(timeline.undated.map((e) => e.title)).toEqual(['Old Legend']);
  });

  it('collects eras', () => {
    expect(timeline.eras).toEqual(['Ascension']);
  });

  it('treats born/died and founded/dissolved as spans', () => {
    const span = timeline.entries.find((e) => e.title === 'Lan');
    expect(span?.kind).toBe('span');
    expect(span?.end?.sort).toBe(445);
  });

  it('finds participants through wikilinks', () => {
    const event = timeline.entries.find((e) => e.title === 'Battle of the Ring');
    expect(event?.participants).toContain('World/Characters/Lan.md');
  });

  it('finds participants through character_ids', () => {
    const scene = note(
      'Story/Scenes/S1.md',
      'title: S1\ndate: 400\ncharacter_ids: [char_lan]',
      'no links',
    );
    const t = buildTimeline([lan, scene]);
    const entry = t.entries.find((e) => e.title === 'S1');
    expect(entry?.participants).toContain('World/Characters/Lan.md');
  });

  it('reports no conflict for an event inside a lifespan', () => {
    expect(timeline.conflicts).toHaveLength(0);
  });

  it('warns when a character appears before their start date', () => {
    const early = note(
      'World/History/Early.md',
      'title: Too Early\ndate: 350',
      'Featuring [[Lan]].',
    );
    const conflicts = buildTimeline([lan, early]).conflicts;
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.severity).toBe('warning');
    expect(conflicts[0]?.message).toContain('before their start date');
  });

  it('warns when a character appears after their end date', () => {
    const late = note('World/History/Late.md', 'title: Too Late\ndate: 500', 'Featuring [[Lan]].');
    const conflicts = buildTimeline([lan, late]).conflicts;
    expect(conflicts[0]?.message).toContain('after their end date');
  });

  it('softens conflicts to advisory when the lifespan date is uncertain', () => {
    const vague = note('World/Characters/Vex.md', 'title: Vex\nid: vex\nborn: c. 380');
    const early = note('World/History/E.md', 'title: E\ndate: 350', 'With [[Vex]].');
    const conflicts = buildTimeline([vague, early]).conflicts;
    expect(conflicts[0]?.severity).toBe('advisory');
  });

  it('warns when a span ends before it starts', () => {
    const broken = note('World/Characters/Bad.md', 'title: Bad\nborn: 500\ndied: 400');
    const conflicts = buildTimeline([broken]).conflicts;
    expect(conflicts[0]?.message).toContain('before it starts');
  });

  it('ignores notes with no date fields', () => {
    const plain = note('World/Characters/Plain.md', 'title: Plain');
    const t = buildTimeline([plain]);
    expect(t.entries).toHaveLength(0);
    expect(t.undated).toHaveLength(0);
  });
});
