import { useMemo, useState } from 'react';
import { buildTimeline, type ParsedNote } from '@storystable/vault';

interface Props {
  notes: ParsedNote[];
  onOpen: (path: string) => void;
}

export function TimelineView({ notes, onOpen }: Props) {
  const timeline = useMemo(() => buildTimeline(notes), [notes]);
  const [era, setEra] = useState('');

  const entries = era === '' ? timeline.entries : timeline.entries.filter((e) => e.era === era);

  // Scale positions across the full dated range; a single-point timeline
  // degenerates gracefully to everything at the left edge.
  const sorts = entries.map((e) => e.start.sort ?? 0);
  const ends = entries.map((e) => e.end?.sort ?? e.start.sort ?? 0);
  const min = Math.min(...sorts, ...ends);
  const max = Math.max(...sorts, ...ends);
  const span = max - min || 1;
  const pct = (value: number) => ((value - min) / span) * 100;

  return (
    <div className="timeline">
      <div className="timeline-toolbar">
        <label className="inline">
          Era
          <select
            value={era}
            onChange={(e) => {
              setEra(e.target.value);
            }}
          >
            <option value="">all</option>
            {timeline.eras.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
        <span className="hint">
          {entries.length} dated
          {timeline.undated.length > 0 && `, ${String(timeline.undated.length)} undated`}
          {timeline.conflicts.length > 0 && (
            <span className="badge warning"> {timeline.conflicts.length} chronology issues</span>
          )}
        </span>
        {entries.length > 0 && (
          <span className="hint">
            {min} → {max}
          </span>
        )}
      </div>

      <div className="timeline-scroll">
        {entries.length === 0 ? (
          <p className="hint">
            No dated notes. Add <code>date</code>, <code>born</code>/<code>died</code>, or{' '}
            <code>founded</code>/<code>dissolved</code> to frontmatter.
          </p>
        ) : (
          <ul className="timeline-rows">
            {entries.map((entry) => {
              const left = pct(entry.start.sort ?? min);
              const right = entry.end?.sort != null ? pct(entry.end.sort) : left;
              const width = Math.max(right - left, 0.8);
              return (
                <li key={`${entry.path}-${entry.start.display}`} className="timeline-row">
                  <button
                    className="note timeline-label"
                    onClick={() => {
                      onOpen(entry.path);
                    }}
                  >
                    {entry.title}
                  </button>
                  <div className="timeline-track">
                    <div
                      className={[
                        'timeline-bar',
                        entry.kind,
                        entry.start.uncertain ? 'uncertain' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{ left: `${String(left)}%`, width: `${String(width)}%` }}
                      title={
                        entry.end
                          ? `${entry.start.display} – ${entry.end.display}`
                          : entry.start.display
                      }
                    />
                  </div>
                  <span className="timeline-date">
                    {entry.start.display}
                    {entry.end && ` – ${entry.end.display}`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {timeline.undated.length > 0 && (
          <>
            <h3>Undated</h3>
            <ul className="undated">
              {timeline.undated.map((e) => (
                <li key={e.path}>
                  <button
                    className="note"
                    onClick={() => {
                      onOpen(e.path);
                    }}
                  >
                    {e.title}
                  </button>
                  <span className="timeline-date">{e.start.display}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {timeline.conflicts.length > 0 && (
          <>
            <h3>Chronology conflicts</h3>
            <ul className="undated">
              {timeline.conflicts.map((c, i) => (
                <li key={i}>
                  <span className={`badge ${c.severity}`}>{c.severity}</span>
                  <button
                    className="note"
                    onClick={() => {
                      onOpen(c.path);
                    }}
                  >
                    {c.path}
                  </button>
                  <span className="timeline-date">{c.message}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
