import { useMemo } from 'react';
import { diffLines, diffStats, collapseContext } from '@storystable/vault';

interface Props {
  path: string;
  before: string;
  after: string;
  busy: boolean;
  onApply: () => void;
  onReject: () => void;
}

/**
 * Review surface for an agent proposal. Spec §1.6: agents propose, the
 * creator owns canon — so nothing is written until the change has been seen.
 */
export function PatchReview({ path, before, after, busy, onApply, onReject }: Props) {
  const lines = useMemo(() => diffLines(before, after), [before, after]);
  const stats = useMemo(() => diffStats(lines), [lines]);
  const chunks = useMemo(() => collapseContext(lines, 3), [lines]);

  const unchanged = stats.added === 0 && stats.removed === 0;

  return (
    <div className="patch-review">
      <div className="patch-head">
        <span className="patch-path">{path}</span>
        <span className="patch-stats">
          <span className="added">+{stats.added}</span>
          <span className="removed">−{stats.removed}</span>
        </span>
      </div>

      {unchanged ? (
        <p className="hint">The proposal is identical to the current note — nothing to apply.</p>
      ) : (
        <div className="patch-diff">
          {chunks.map((chunk, index) =>
            chunk.kind === 'gap' ? (
              <div key={index} className="diff-gap">
                … {chunk.hidden} unchanged {chunk.hidden === 1 ? 'line' : 'lines'}
              </div>
            ) : (
              chunk.lines.map((line, i) => (
                <div key={`${String(index)}-${String(i)}`} className={`diff-line ${line.op}`}>
                  <span className="diff-gutter">
                    {line.op === 'add' ? '+' : line.op === 'remove' ? '−' : ' '}
                  </span>
                  <span className="diff-text">{line.text === '' ? ' ' : line.text}</span>
                </div>
              ))
            ),
          )}
        </div>
      )}

      <div className="row patch-actions">
        <button disabled={busy || unchanged} onClick={onApply}>
          {busy ? 'Applying…' : 'Apply to note'}
        </button>
        <button className="secondary" disabled={busy} onClick={onReject}>
          Discard
        </button>
      </div>
      <p className="hint">
        Applying is refused if the note changed since this was proposed, so a concurrent edit is
        never overwritten.
      </p>
    </div>
  );
}
