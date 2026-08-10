import { useMemo, useState } from 'react';
import {
  collectColumns,
  buildRows,
  groupRows,
  formatValue,
  rowsToCsv,
  ENTITY_TEMPLATES,
  createEntity,
  setFrontmatterValue,
  type ParsedNote,
} from '@storystable/vault';
import { sharedValidator, WORLD_ENTITY_SCHEMA_ID } from '@storystable/schemas/browser';

interface Props {
  notes: ParsedNote[];
  onOpen: (path: string) => void;
  /** Persist an edited note source. */
  onSaveNote: (path: string, source: string) => Promise<void>;
  /** Create a brand-new note file. */
  onCreateNote: (path: string, source: string) => Promise<void>;
}

const DEFAULT_COLUMNS = 4;

export function PropertiesView({ notes, onOpen, onSaveNote, onCreateNote }: Props) {
  const allColumns = useMemo(() => collectColumns(notes), [notes]);
  const [visible, setVisible] = useState<string[] | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortDescending, setSortDescending] = useState(false);
  const [groupBy, setGroupBy] = useState<string>('');
  const [editing, setEditing] = useState<{ path: string; key: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState(ENTITY_TEMPLATES[0]?.entityType ?? 'character');

  const columns = visible ?? allColumns.slice(0, DEFAULT_COLUMNS).map((c) => c.key);

  const rows = useMemo(
    () =>
      buildRows(notes, {
        filters,
        ...(sortBy !== undefined ? { sortBy } : {}),
        sortDescending,
      }),
    [notes, filters, sortBy, sortDescending],
  );
  const groups = useMemo(
    () => (groupBy === '' ? [{ key: '', rows }] : groupRows(rows, groupBy)),
    [rows, groupBy],
  );

  const validator = sharedValidator();
  const invalidPaths = useMemo(() => {
    const map = new Map<string, string>();
    for (const note of notes) {
      if (note.frontmatter.type !== 'world_entity') continue;
      const issues = validator.validate(WORLD_ENTITY_SCHEMA_ID, note.frontmatter);
      if (issues.length > 0) map.set(note.path, issues.map((i) => i.message).join('; '));
    }
    return map;
  }, [notes, validator]);

  const toggleSort = (key: string) => {
    if (sortBy === key) setSortDescending((d) => !d);
    else {
      setSortBy(key);
      setSortDescending(false);
    }
  };

  const commitEdit = () => {
    if (!editing) return;
    const note = notes.find((n) => n.path === editing.path);
    if (!note) {
      setEditing(null);
      return;
    }
    const previous = formatValue(note.frontmatter[editing.key]);
    if (editValue === previous) {
      setEditing(null);
      return;
    }
    // Arrays stay arrays: a comma in the input means a list.
    const wasArray = Array.isArray(note.frontmatter[editing.key]);
    const parsedValue: unknown =
      editValue === ''
        ? undefined
        : wasArray || editValue.includes(',')
          ? editValue
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s !== '')
          : editValue;

    const next = setFrontmatterValue(note.source, editing.key, parsedValue);
    setBusy(true);
    setError(null);
    onSaveNote(note.path, next)
      .catch((e: unknown) => {
        setError(typeof e === 'string' ? e : e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        setBusy(false);
        setEditing(null);
      });
  };

  const create = () => {
    const title = newTitle.trim();
    if (title === '') return;
    const template = ENTITY_TEMPLATES.find((t) => t.entityType === newType);
    if (!template) return;
    const entity = createEntity(template, title, new Date().toISOString());
    if (notes.some((n) => n.path === entity.path)) {
      setError(`${entity.path} already exists`);
      return;
    }
    setBusy(true);
    setError(null);
    onCreateNote(entity.path, entity.source)
      .then(() => {
        setNewTitle('');
        onOpen(entity.path);
      })
      .catch((e: unknown) => {
        setError(typeof e === 'string' ? e : e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        setBusy(false);
      });
  };

  const exportCsv = () => {
    const csv = rowsToCsv(rows, columns);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'properties.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="properties">
      <div className="prop-toolbar">
        <select
          value={newType}
          onChange={(e) => {
            setNewType(e.target.value as typeof newType);
          }}
        >
          {ENTITY_TEMPLATES.map((t) => (
            <option key={t.entityType} value={t.entityType}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          value={newTitle}
          placeholder="New entity title…"
          onChange={(e) => {
            setNewTitle(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') create();
          }}
        />
        <button disabled={busy || newTitle.trim() === ''} onClick={create}>
          Create
        </button>
        <span className="spacer" />
        <label className="inline">
          Group
          <select
            value={groupBy}
            onChange={(e) => {
              setGroupBy(e.target.value);
            }}
          >
            <option value="">none</option>
            {allColumns.map((c) => (
              <option key={c.key} value={c.key}>
                {c.key}
              </option>
            ))}
          </select>
        </label>
        <button onClick={exportCsv}>Export CSV</button>
      </div>

      <details className="columns-picker">
        <summary>Columns ({columns.length})</summary>
        <div>
          {allColumns.map((c) => (
            <label key={c.key} className="inline">
              <input
                type="checkbox"
                checked={columns.includes(c.key)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...columns, c.key]
                    : columns.filter((k) => k !== c.key);
                  setVisible(next);
                }}
              />
              {c.key} <span className="count-muted">{c.count}</span>
            </label>
          ))}
        </div>
      </details>

      {error && <p className="error">{error}</p>}

      <div className="prop-scroll">
        <table className="prop-table">
          <thead>
            <tr>
              <th>
                <button
                  className="col-head"
                  onClick={() => {
                    toggleSort('title');
                  }}
                >
                  title {sortBy === 'title' ? (sortDescending ? '▾' : '▴') : ''}
                </button>
              </th>
              {columns.map((key) => (
                <th key={key}>
                  <button
                    className="col-head"
                    onClick={() => {
                      toggleSort(key);
                    }}
                  >
                    {key} {sortBy === key ? (sortDescending ? '▾' : '▴') : ''}
                  </button>
                </th>
              ))}
            </tr>
            <tr className="filter-row">
              <th />
              {columns.map((key) => (
                <th key={key}>
                  <input
                    value={filters[key] ?? ''}
                    placeholder="filter"
                    onChange={(e) => {
                      setFilters((f) => ({ ...f, [key]: e.target.value }));
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.key}>
              {groupBy !== '' && (
                <tr className="group-head">
                  <td colSpan={columns.length + 1}>
                    {groupBy}: {group.key} ({group.rows.length})
                  </td>
                </tr>
              )}
              {group.rows.map((row) => {
                const invalid = invalidPaths.get(row.path);
                return (
                  <tr key={row.path}>
                    <td>
                      <button
                        className="note"
                        onClick={() => {
                          onOpen(row.path);
                        }}
                      >
                        {row.title}
                      </button>
                      {invalid && (
                        <span className="badge error" title={invalid}>
                          schema
                        </span>
                      )}
                    </td>
                    {columns.map((key) => {
                      const isEditing = editing?.path === row.path && editing.key === key;
                      return (
                        <td
                          key={key}
                          onDoubleClick={() => {
                            setEditing({ path: row.path, key });
                            setEditValue(formatValue(row.values[key]));
                          }}
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              value={editValue}
                              onChange={(e) => {
                                setEditValue(e.target.value);
                              }}
                              onBlur={commitEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEdit();
                                if (e.key === 'Escape') setEditing(null);
                              }}
                            />
                          ) : (
                            <span className="cell">{formatValue(row.values[key])}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
        {rows.length === 0 && <p className="hint">No notes match the current filters.</p>}
      </div>
      <p className="hint">
        Double-click a cell to edit — changes write back to the note&rsquo;s frontmatter.
      </p>
    </div>
  );
}
