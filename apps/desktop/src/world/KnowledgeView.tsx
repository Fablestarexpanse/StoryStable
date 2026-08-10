import { useMemo, useState } from 'react';
import {
  buildKnowledgeModel,
  stateAt,
  spoilersFor,
  isUnknownValue,
  AUDIENCE,
  type FactValue,
  type ParsedNote,
} from '@storystable/vault';

interface Props {
  notes: ParsedNote[];
  onOpen: (path: string) => void;
}

type CellKind = 'known' | 'false_belief' | 'unknown';

function classify(
  value: FactValue | undefined,
  truth: FactValue | undefined,
): { kind: CellKind; label: string } {
  const v = value ?? null;
  if (isUnknownValue(v)) return { kind: 'unknown', label: '—' };
  if (truth !== undefined && truth !== v) return { kind: 'false_belief', label: String(v) };
  return { kind: 'known', label: String(v) };
}

export function KnowledgeView({ notes, onOpen }: Props) {
  const model = useMemo(() => buildKnowledgeModel(notes), [notes]);
  const [sceneId, setSceneId] = useState<string>('');

  const positions = useMemo(() => {
    const seen: { sceneId: string; label: string }[] = [];
    for (const snapshot of model.snapshots) {
      if (!seen.some((s) => s.sceneId === snapshot.sceneId)) {
        seen.push({ sceneId: snapshot.sceneId, label: snapshot.sceneId });
      }
    }
    return seen;
  }, [model]);

  const effectiveScene = sceneId === '' ? null : sceneId;
  const { worldState, knowledge } = useMemo(
    () => stateAt(model, effectiveScene),
    [model, effectiveScene],
  );

  const characters = model.observers.filter((o) => o !== AUDIENCE);

  if (model.snapshots.length === 0) {
    return (
      <div className="knowledge">
        <p className="hint">
          No state snapshots yet. Create notes with <code>type: state_snapshot</code>,{' '}
          <code>story_position</code>, <code>world_state</code>, and <code>knowledge</code> to track
          what is true versus what each character and the audience knows.
        </p>
      </div>
    );
  }

  return (
    <div className="knowledge">
      <div className="knowledge-toolbar">
        <label className="inline">
          As of
          <select
            value={sceneId}
            onChange={(e) => {
              setSceneId(e.target.value);
            }}
          >
            <option value="">end of story</option>
            {positions.map((p) => (
              <option key={p.sceneId} value={p.sceneId}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <span className="hint">
          {model.facts.length} facts · {model.observers.length} observers
        </span>
        <span className="legend">
          <i className="swatch known" /> known
          <i className="swatch false_belief" /> false belief
          <i className="swatch unknown" /> unknown
        </span>
      </div>

      <div className="knowledge-scroll">
        <table className="knowledge-table">
          <thead>
            <tr>
              <th className="fact-col">Fact</th>
              <th className="truth-col">World truth</th>
              <th>Audience</th>
              {characters.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.facts.map((fact) => {
              const truth = worldState[fact];
              return (
                <tr key={fact}>
                  <td className="fact-col">{fact}</td>
                  <td className="truth-col">
                    {truth === undefined ? (
                      <span className="unrecorded">not recorded</span>
                    ) : (
                      String(truth)
                    )}
                  </td>
                  {[AUDIENCE, ...characters].map((observer) => {
                    const { kind, label } = classify(knowledge[observer]?.[fact], truth);
                    return (
                      <td
                        key={observer}
                        className={`belief ${kind}`}
                        title={kind.replace('_', ' ')}
                      >
                        {label}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {characters.length > 0 && (
          <>
            <h3>Spoiler sets</h3>
            <p className="hint">
              What the audience knows but the character does not — an agent writing this character
              must not reveal these.
            </p>
            <ul className="spoilers">
              {characters.map((c) => {
                const spoilers = spoilersFor(model, c, effectiveScene);
                return (
                  <li key={c}>
                    <span className="rel-type">{c}</span>
                    {spoilers.length === 0 ? (
                      <span className="hint">nothing withheld</span>
                    ) : (
                      spoilers.map((s) => (
                        <span key={s} className="badge warning">
                          {s}
                        </span>
                      ))
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <h3>Snapshots</h3>
        <ul className="undated">
          {model.snapshots.map((s) => (
            <li key={s.path}>
              <button
                className="note"
                onClick={() => {
                  onOpen(s.path);
                }}
              >
                {s.sceneId} ({s.phase})
              </button>
              <span className="timeline-date">{s.path}</span>
              {s.order === null && <span className="badge warning">unanchored</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
