import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseNote, buildLinkIndex, type ParsedNote } from '@storystable/vault';
import type { ProjectInfo } from '../services/vault.js';
import { createProject, openProject, listNotes, readNote } from '../services/vault.js';

interface VaultState {
  project: ProjectInfo;
  notePaths: string[];
  notes: ParsedNote[];
}

export function WorldWorkspace() {
  const [rootInput, setRootInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [vault, setVault] = useState<VaultState | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadVault = useCallback(async (project: ProjectInfo) => {
    const notePaths = await listNotes(project.root);
    const notes = await Promise.all(
      notePaths.map(async (path) =>
        parseNote({ path, source: await readNote(project.root, path) }),
      ),
    );
    setVault({ project, notePaths, notes });
    setSelected(null);
  }, []);

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

  const linkIndex = useMemo(() => (vault ? buildLinkIndex(vault.notes) : null), [vault]);
  const selectedNote = vault?.notes.find((n) => n.path === selected) ?? null;
  const backlinks = selected && linkIndex ? (linkIndex.backlinks.get(selected) ?? []) : [];

  useEffect(() => {
    setError(null);
  }, [selected]);

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

  return (
    <div className="vault">
      <aside className="navigator">
        <div className="project-name">
          {vault.project.name}
          <button
            className="link-btn"
            onClick={() => {
              run(async () => {
                await loadVault(vault.project);
              });
            }}
          >
            refresh
          </button>
        </div>
        <ul>
          {vault.notePaths.map((path) => (
            <li key={path}>
              <button
                className={path === selected ? 'note active' : 'note'}
                onClick={() => {
                  setSelected(path);
                }}
              >
                {path}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="editor">
        {selectedNote ? (
          <>
            <h2>{selectedNote.title}</h2>
            {selectedNote.frontmatterErrors.length > 0 && (
              <p className="error">frontmatter: {selectedNote.frontmatterErrors.join('; ')}</p>
            )}
            <pre className="note-body">{selectedNote.body}</pre>
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
                      setSelected(b);
                    }}
                  >
                    {b}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {error && <p className="error">{error}</p>}
      </aside>
    </div>
  );
}
