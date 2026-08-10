import { useEffect, useState } from 'react';
import type { HealthFinding } from '@storystable/vault';
import type { IndexHealth } from '../services/vault.js';
import { indexHealth } from '../services/vault.js';

interface Props {
  root: string;
  findings: HealthFinding[];
  onOpen: (path: string) => void;
}

export function HealthView({ root, findings, onOpen }: Props) {
  const [index, setIndex] = useState<IndexHealth | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);

  useEffect(() => {
    indexHealth(root).then(setIndex, (e: unknown) => {
      setIndexError(typeof e === 'string' ? e : String(e));
    });
  }, [root, findings]);

  const counts = { error: 0, warning: 0, advisory: 0 };
  for (const f of findings) counts[f.severity] += 1;

  return (
    <div className="health">
      <div className="health-summary">
        <span className="badge error">{counts.error} errors</span>
        <span className="badge warning">{counts.warning} warnings</span>
        <span className="badge advisory">{counts.advisory} advisories</span>
        {index && (
          <span className={index.integrity_ok ? 'badge ok' : 'badge error'}>
            index: {index.notes} notes, integrity {index.integrity_ok ? 'ok' : 'FAILED'}
          </span>
        )}
        {indexError && <span className="badge error">index: {indexError}</span>}
      </div>
      {findings.length === 0 ? (
        <p className="hint">No findings. The vault is healthy.</p>
      ) : (
        <table className="health-table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Category</th>
              <th>Note</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f, i) => (
              <tr key={i}>
                <td>
                  <span className={`badge ${f.severity}`}>{f.severity}</span>
                </td>
                <td>{f.category}</td>
                <td>
                  {f.path ? (
                    <button
                      className="note"
                      onClick={() => {
                        onOpen(f.path ?? '');
                      }}
                    >
                      {f.path}
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{f.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
