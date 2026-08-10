/**
 * Line diff for reviewing agent proposals.
 *
 * A proposal is only reviewable if the user can see exactly what changes, so
 * this produces a line-level diff rather than showing two blobs side by side.
 * Notes are small, so a straightforward LCS is fine; the guard below keeps a
 * pathological input from locking the UI.
 */

export type DiffOp = 'context' | 'add' | 'remove';

export interface DiffLine {
  op: DiffOp;
  text: string;
  /** 1-based line number in the original, or null for added lines. */
  beforeLine: number | null;
  /** 1-based line number in the revision, or null for removed lines. */
  afterLine: number | null;
}

export interface DiffStats {
  added: number;
  removed: number;
  unchanged: number;
}

/**
 * Above this line count the quadratic LCS table gets expensive, so the diff
 * degrades to a whole-file replacement rather than hanging. Reviewing such a
 * change as one block is honest — it is not a small edit.
 */
const LCS_LINE_LIMIT = 3000;

const splitLines = (text: string): string[] => (text === '' ? [] : text.split('\n'));

/** Diff two texts by line. Never throws. */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = splitLines(before);
  const b = splitLines(after);

  if (a.length > LCS_LINE_LIMIT || b.length > LCS_LINE_LIMIT) {
    return [
      ...a.map((text, i) => ({
        op: 'remove' as const,
        text,
        beforeLine: i + 1,
        afterLine: null,
      })),
      ...b.map((text, i) => ({ op: 'add' as const, text, beforeLine: null, afterLine: i + 1 })),
    ];
  }

  // Longest common subsequence over lines.
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table: number[] = new Array<number>(rows * cols).fill(0);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i * cols + j] =
        a[i] === b[j]
          ? (table[(i + 1) * cols + (j + 1)] ?? 0) + 1
          : Math.max(table[(i + 1) * cols + j] ?? 0, table[i * cols + (j + 1)] ?? 0);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ op: 'context', text: a[i] ?? '', beforeLine: i + 1, afterLine: j + 1 });
      i++;
      j++;
    } else if ((table[(i + 1) * cols + j] ?? 0) >= (table[i * cols + (j + 1)] ?? 0)) {
      out.push({ op: 'remove', text: a[i] ?? '', beforeLine: i + 1, afterLine: null });
      i++;
    } else {
      out.push({ op: 'add', text: b[j] ?? '', beforeLine: null, afterLine: j + 1 });
      j++;
    }
  }
  while (i < a.length) {
    out.push({ op: 'remove', text: a[i] ?? '', beforeLine: i + 1, afterLine: null });
    i++;
  }
  while (j < b.length) {
    out.push({ op: 'add', text: b[j] ?? '', beforeLine: null, afterLine: j + 1 });
    j++;
  }
  return out;
}

export function diffStats(lines: readonly DiffLine[]): DiffStats {
  const stats: DiffStats = { added: 0, removed: 0, unchanged: 0 };
  for (const line of lines) {
    if (line.op === 'add') stats.added++;
    else if (line.op === 'remove') stats.removed++;
    else stats.unchanged++;
  }
  return stats;
}

/**
 * Drop long runs of unchanged lines, keeping `context` lines either side of
 * each change. A gap is reported so the UI can show "… N unchanged lines".
 */
export interface DiffChunk {
  kind: 'lines' | 'gap';
  lines: DiffLine[];
  /** Number of hidden lines, for `gap` chunks. */
  hidden: number;
}

export function collapseContext(lines: readonly DiffLine[], context = 3): DiffChunk[] {
  const keep = new Array<boolean>(lines.length).fill(false);
  lines.forEach((line, index) => {
    if (line.op === 'context') return;
    for (
      let k = Math.max(0, index - context);
      k <= Math.min(lines.length - 1, index + context);
      k++
    ) {
      keep[k] = true;
    }
  });

  // A diff with no changes at all has nothing to collapse around.
  if (!keep.includes(true)) {
    return lines.length === 0 ? [] : [{ kind: 'lines', lines: [...lines], hidden: 0 }];
  }

  const chunks: DiffChunk[] = [];
  let buffer: DiffLine[] = [];
  let hidden = 0;
  const flushLines = () => {
    if (buffer.length > 0) {
      chunks.push({ kind: 'lines', lines: buffer, hidden: 0 });
      buffer = [];
    }
  };
  const flushGap = () => {
    if (hidden > 0) {
      chunks.push({ kind: 'gap', lines: [], hidden });
      hidden = 0;
    }
  };

  lines.forEach((line, index) => {
    if (keep[index] === true) {
      flushGap();
      buffer.push(line);
    } else {
      flushLines();
      hidden++;
    }
  });
  flushLines();
  flushGap();
  return chunks;
}

/**
 * Strip a fenced code block an agent may have wrapped the file in.
 *
 * Models often return file contents inside ```markdown fences even when asked
 * not to; writing the fence into the note would corrupt it.
 */
export function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = /^```[^\n]*\n([\s\S]*?)\n?```$/.exec(trimmed);
  return match?.[1] ?? text;
}
