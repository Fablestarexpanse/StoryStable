import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  parseNote,
  buildLinkIndex,
  buildGraph,
  computeHealth,
  type ParsedNote,
} from '@storystable/vault';
import { GraphView } from './GraphView.js';
import { HealthView } from './HealthView.js';
import { CanvasView } from './CanvasView.js';
import type { Attachment, ProjectInfo, SearchHit } from '../services/vault.js';
import {
  createProject,
  openProject,
  listNotes,
  readNote,
  writeNote,
  rebuildIndex,
  searchNotes,
  watchProject,
  onVaultChanged,
  listAttachments,
} from '../services/vault.js';
import { MarkdownEditor } from './MarkdownEditor.js';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface VaultState {
  project: ProjectInfo;
  notePaths: string[];
  notes: ParsedNote[];
  attachments: Attachment[];
}

export function WorldWorkspace() {
  const [rootInput, setRootInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [vault, setVault] = useState<VaultState | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [view, setView] = useState<'notes' | 'graph' | 'canvas' | 'health'>('notes');

  const refreshNotes = useCallback(async (project: ProjectInfo) => {
    const notePaths = await listNotes(project.root);
    const notes = await Promise.all(
      notePaths.map(async (path) =>
        parseNote({ path, source: await readNote(project.root, path) }),
      ),
    );
    const attachments = await listAttachments(project.root);
    setVault({ project, notePaths, notes, attachments });
  }, []);

  const loadVault = useCallback(
    async (project: ProjectInfo) => {
      await rebuildIndex(project.root);
      await refreshNotes(project);
      await watchProject(project.root);
      setSelected(null);
    },
    [refreshNotes],
  );

  const run = useCallback(
    (action: () => Promise<void>) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      action()
        .catch((e: unknown) => {
          setError(typeof e === 'string' ? e : e instanceof Error ? e.message : String(e));
        })
        .finally(() => {
          setBusy(false);
        });
    },
    [busy],
  );

  // Live refresh from the file watcher, debounced. Skip while editing so an
  // in-progress draft is never clobbered by our own saves.
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  useEffect(() => {
    if (!vault) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unlistenPromise = onVaultChanged(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (!dirtyRef.current) void refreshNotes(vault.project);
      }, 300);
    });
    return () => {
      if (timer) clearTimeout(timer);
      void unlistenPromise.then((unlisten) => {
        unlisten();
      });
    };
  }, [vault, refreshNotes]);

  // Full-text search, debounced.
  useEffect(() => {
    if (!vault) return;
    const q = query.trim();
    if (q === '') {
      setHits(null);
      return;
    }
    const timer = setTimeout(() => {
      searchNotes(vault.project.root, q).then(setHits, () => {
        setHits([]);
      });
    }, 150);
    return () => {
      clearTimeout(timer);
    };
  }, [query, vault]);

  const linkIndex = useMemo(() => (vault ? buildLinkIndex(vault.notes) : null), [vault]);
  const graph = useMemo(
    () => (vault && linkIndex ? buildGraph(vault.notes, linkIndex) : null),
    [vault, linkIndex],
  );
  const health = useMemo(
    () =>
      vault && linkIndex
        ? computeHealth(
            vault.notes,
            linkIndex,
            vault.attachments.map((a) => a.path),
          )
        : [],
    [vault, linkIndex],
  );
  const selectedNote = vault?.notes.find((n) => n.path === selected) ?? null;
  const backlinks = selected && linkIndex ? (linkIndex.backlinks.get(selected) ?? []) : [];

  const selectNote = useCallback((path: string) => {
    setSelected(path);
    setDraft(null);
    setDirty(false);
    setSavedAt(null);
    setError(null);
    setView('notes');
  }, []);

  const save = useCallback(() => {
    if (!vault || !selected || draft === null) return;
    run(async () => {
      await writeNote(vault.project.root, selected, draft);
      setDirty(false);
      setSavedAt(Date.now());
      await refreshNotes(vault.project);
    });
  }, [vault, selected, draft, run, refreshNotes]);

  if (!vault) {
    return (
      <div className="vault-setup">
        <h1>Open a project vault</h1>
        <label>
          Project folder
          <input
            value={rootInput}
            onChange={(e) => {
              setRootInput(e.target.value);
            }}
            placeholder="F:\Vaults\MyWorld"
            spellCheck={false}
          />
        </label>
        <div className="row">
          <button
            disabled={busy || rootInput.trim() === ''}
            onClick={() => {
              run(async () => {
                await loadVault(await openProject(rootInput.trim()));
              });
            }}
          >
            Open existing
          </button>
        </div>
        <label>
          New project name
          <input
            value={nameInput}
            onChange={(e) => {
              setNameInput(e.target.value);
            }}
            placeholder="My World"
          />
        </label>
        <div className="row">
          <button
            disabled={busy || rootInput.trim() === '' || nameInput.trim() === ''}
            onClick={() => {
              run(async () => {
                await loadVault(await createProject(rootInput.trim(), nameInput.trim()));
              });
            }}
          >
            Create in folder
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  const healthCount = health.filter((f) => f.severity !== 'advisory').length;

  return (
    <div className="vault">
      <aside className="navigator">
        <div className="project-name">{vault.project.name}</div>
        <div className="view-switch">
          {(['notes', 'graph', 'canvas', 'health'] as const).map((v) => (
            <button
              key={v}
              className={view === v ? 'view active' : 'view'}
              onClick={() => {
                setView(v);
              }}
            >
              {v}
              {v === 'health' && healthCount > 0 && <em className="count">{healthCount}</em>}
            </button>
          ))}
        </div>
        <input
          className="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          placeholder="Search notes…"
          spellCheck={false}
        />
        {hits ? (
          <ul>
            {hits.length === 0 && <li className="hint">No matches.</li>}
            {hits.map((hit) => (
              <li key={hit.path}>
                <button
                  className={hit.path === selected ? 'note active' : 'note'}
                  onClick={() => {
                    selectNote(hit.path);
                  }}
                >
                  <span className="note-title">{hit.title}</span>
                  <span className="snippet">{hit.snippet}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul>
            {vault.notePaths.map((path) => (
              <li key={path}>
                <button
                  className={path === selected ? 'note active' : 'note'}
                  onClick={() => {
                    selectNote(path);
                  }}
                >
                  {path}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <section className="editor">
        {view === 'graph' && graph ? (
          <GraphView graph={graph} onOpen={selectNote} />
        ) : view === 'canvas' ? (
          <CanvasView
            root={vault.project.root}
            notePaths={vault.notePaths}
            onOpenNote={selectNote}
          />
        ) : view === 'health' ? (
          <HealthView root={vault.project.root} findings={health} onOpen={selectNote} />
        ) : selectedNote ? (
          <>
            <div className="editor-head">
              <h2>{selectedNote.title}</h2>
              <div className="editor-actions">
                {dirty && <span className="dirty-dot" title="Unsaved changes" />}
                {!dirty && savedAt !== null && <span className="saved">saved</span>}
                <button disabled={!dirty || busy} onClick={save}>
                  Save
                </button>
              </div>
            </div>
            {selectedNote.frontmatterErrors.length > 0 && (
              <p className="error">frontmatter: {selectedNote.frontmatterErrors.join('; ')}</p>
            )}
            <MarkdownEditor
              path={selectedNote.path}
              source={draft ?? selectedNote.source}
              onChange={(contents) => {
                setDraft(contents);
                setDirty(true);
              }}
              onSave={save}
            />
          </>
        ) : (
          <p className="hint">Select a note.</p>
        )}
      </section>
      <aside className="inspector">
        {selectedNote && (
          <>
            <h3>Properties</h3>
            <pre className="fm">{JSON.stringify(selectedNote.frontmatter, null, 2)}</pre>
            <h3>Links</h3>
            <ul>
              {selectedNote.links.map((l, i) => (
                <li key={i}>{l.target || `#${l.heading ?? ''}`}</li>
              ))}
            </ul>
            <h3>Backlinks</h3>
            <ul>
              {backlinks.map((b) => (
                <li key={b}>
                  <button
                    className="note"
                    onClick={() => {
                      selectNote(b);
                    }}
                  >
                    {b}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <h3>Attachments ({vault.attachments.length})</h3>
        <ul className="attachments">
          {vault.attachments.length === 0 && <li className="hint">None in this vault.</li>}
          {vault.attachments.map((a) => (
            <li key={a.path}>
              <span className={`badge kind-${a.kind}`}>{a.kind}</span> {a.path}
              <span className="size">{formatSize(a.size)}</span>
            </li>
          ))}
        </ul>
        {error && <p className="error">{error}</p>}
      </aside>
    </div>
  );
}
