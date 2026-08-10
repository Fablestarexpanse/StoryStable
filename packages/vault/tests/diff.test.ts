import { describe, expect, it } from 'vitest';
import { diffLines, diffStats, collapseContext, stripCodeFence } from '../src/diff.js';

describe('diffLines', () => {
  it('marks identical text as all context', () => {
    const lines = diffLines('a\nb', 'a\nb');
    expect(lines.every((l) => l.op === 'context')).toBe(true);
    expect(diffStats(lines)).toEqual({ added: 0, removed: 0, unchanged: 2 });
  });

  it('detects an inserted line without rewriting its neighbours', () => {
    const lines = diffLines('a\nc', 'a\nb\nc');
    expect(lines.map((l) => `${l.op}:${l.text}`)).toEqual(['context:a', 'add:b', 'context:c']);
  });

  it('detects a removed line', () => {
    const lines = diffLines('a\nb\nc', 'a\nc');
    expect(lines.map((l) => `${l.op}:${l.text}`)).toEqual(['context:a', 'remove:b', 'context:c']);
  });

  it('represents a changed line as a remove plus an add', () => {
    const lines = diffLines('hello', 'goodbye');
    expect(diffStats(lines)).toEqual({ added: 1, removed: 1, unchanged: 0 });
  });

  it('tracks line numbers on each side', () => {
    const lines = diffLines('a\nb', 'a\nx\nb');
    const added = lines.find((l) => l.op === 'add');
    expect(added?.afterLine).toBe(2);
    expect(added?.beforeLine).toBeNull();
    const last = lines[lines.length - 1];
    expect(last?.beforeLine).toBe(2);
    expect(last?.afterLine).toBe(3);
  });

  it('handles an empty original (a created note)', () => {
    const lines = diffLines('', 'new content');
    expect(diffStats(lines)).toEqual({ added: 1, removed: 0, unchanged: 0 });
  });

  it('handles an emptied file', () => {
    expect(diffStats(diffLines('gone', ''))).toEqual({ added: 0, removed: 1, unchanged: 0 });
  });

  it('handles both sides empty', () => {
    expect(diffLines('', '')).toEqual([]);
  });

  it('keeps the common subsequence rather than replacing everything', () => {
    // A naive diff would mark all six lines changed.
    const before = 'one\ntwo\nthree\nfour';
    const after = 'one\nTWO\nthree\nfour';
    const stats = diffStats(diffLines(before, after));
    expect(stats).toEqual({ added: 1, removed: 1, unchanged: 3 });
  });

  it('degrades to whole-file replacement past the size guard instead of hanging', () => {
    const big = Array.from({ length: 3100 }, (_, i) => `line ${String(i)}`).join('\n');
    const lines = diffLines(big, `${big}\nextra`);
    const stats = diffStats(lines);
    expect(stats.unchanged).toBe(0);
    expect(stats.removed).toBe(3100);
    expect(stats.added).toBe(3101);
  });
});

describe('collapseContext', () => {
  const before = Array.from({ length: 40 }, (_, i) => `line ${String(i)}`).join('\n');
  const after = before.replace('line 20', 'line 20 changed');

  it('hides unchanged runs far from any change', () => {
    const chunks = collapseContext(diffLines(before, after), 2);
    const gaps = chunks.filter((c) => c.kind === 'gap');
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.reduce((sum, g) => sum + g.hidden, 0)).toBeGreaterThan(20);
  });

  it('keeps the requested context either side of a change', () => {
    const chunks = collapseContext(diffLines(before, after), 2);
    const shown = chunks.filter((c) => c.kind === 'lines').flatMap((c) => c.lines);
    expect(shown.some((l) => l.text === 'line 18')).toBe(true);
    expect(shown.some((l) => l.text === 'line 22')).toBe(true);
    expect(shown.some((l) => l.text === 'line 5')).toBe(false);
  });

  it('shows everything when there are no changes', () => {
    const lines = diffLines('a\nb', 'a\nb');
    const chunks = collapseContext(lines, 2);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.lines).toHaveLength(2);
  });

  it('returns nothing for an empty diff', () => {
    expect(collapseContext([], 2)).toEqual([]);
  });

  it('never loses a changed line', () => {
    const lines = diffLines(before, after);
    const shown = collapseContext(lines, 1)
      .filter((c) => c.kind === 'lines')
      .flatMap((c) => c.lines);
    const changed = lines.filter((l) => l.op !== 'context');
    for (const line of changed) {
      expect(shown).toContainEqual(line);
    }
  });
});

describe('stripCodeFence', () => {
  it('unwraps a fenced block a model added around file contents', () => {
    expect(stripCodeFence('```markdown\n# Title\n\nBody\n```')).toBe('# Title\n\nBody');
  });

  it('unwraps a fence with no language tag', () => {
    expect(stripCodeFence('```\nplain\n```')).toBe('plain');
  });

  it('leaves unfenced content alone', () => {
    expect(stripCodeFence('# Title\n\nBody')).toBe('# Title\n\nBody');
  });

  it('does not strip fences that are part of the note body', () => {
    const note = '# Title\n\n```js\nconst x = 1;\n```\n\nTrailing prose.';
    expect(stripCodeFence(note)).toBe(note);
  });
});
