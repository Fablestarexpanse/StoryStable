import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  compileH3,
  createShot,
  parseNote,
  parseShot,
  shotToH3Input,
  type CompiledH3,
  type ParsedNote,
  type Shot,
} from '@storystable/vault';
import type { ProjectInfo } from '../services/vault.js';
import {
  listNotes,
  readNote,
  writeNote,
  recentProjects,
  openProject,
  isDesktop,
  BROWSER_ONLY_MESSAGE,
} from '../services/vault.js';
import { MarkdownEditor } from '../world/MarkdownEditor.js';

interface ShotEntry {
  shot: Shot;
  note: ParsedNote;
}

/**
 * STUDIO workspace. Shots are renderer-neutral notes; the H3 prompt beside
 * them is compiled, never stored (spec §1.4/§1.5). That is why the prompt
 * panel is read-only: editing it would create a second source of truth that
 * the next recompile would silently discard.
 */
export function StudioWorkspace() {
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [entries, setEntries] = useState<ShotEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isDesktop()) return;
    recentProjects().then(
      async (list) => {
        const existing = list.find((r) => r.exists);
        if (!existing) return;
        setProject(await openProject(existing.root));
      },
      () => undefined,
    );
  }, []);

  const load = useCallback(async (root: string) => {
    const paths = await listNotes(root);
    const notes = await Promise.all(
      paths.map(async (p) => parseNote({ path: p, source: await readNote(root, p) })),
    );
    const found: ShotEntry[] = [];
    for (const note of notes) {
      const shot = parseShot(note);
      if (shot) found.push({ shot, note });
    }
    found.sort(
      (a, b) =>
        a.shot.sceneId.localeCompare(b.shot.sceneId) ||
        a.shot.order - b.shot.order ||
        a.shot.path.localeCompare(b.shot.path),
    );
    setEntries(found);
  }, []);

  useEffect(() => {
    if (!project) return;
    void load(project.root).catch(() => {
      setEntries([]);
    });
  }, [project, load]);

  const active = entries.find((e) => e.shot.path === selected) ?? null;

  // The note body is the description prose. Editing it changes the compiled
  // prompt immediately, which is the point — the prompt is a view of the shot.
  const body = draft ?? active?.note.body ?? '';

  const compiled = useMemo((): { result: CompiledH3; gaps: string[] } | null => {
    if (!active) return null;
    const { input, gaps } = shotToH3Input(active.shot, { body });
    return { result: compileH3(input), gaps };
  }, [active, body]);

  const select = (path: string) => {
    setSelected(path);
    setDraft(null);
    setDirty(false);
    setError(null);
    setCopied(false);
  };

  const save = () => {
    if (!project || !active || draft === null) return;
    // Only the body changes here; frontmatter is rewritten byte-for-byte from
    // the note's own source so an edit in STUDIO cannot reformat fields it
    // does not understand.
    const frontmatter = active.note.source.slice(
      0,
      active.note.source.length - active.note.body.length,
    );
    setBusy(true);
    setError(null);
    writeNote(project.root, active.shot.path, frontmatter + draft)
      .then(async () => {
        setDirty(false);
        setDraft(null);
        await load(project.root);
      })
      .catch((e: unknown) => {
        setError(typeof e === 'string' ? e : e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        setBusy(false);
      });
  };

  const addShot = () => {
    if (!project) return;
    const order = entries.length + 1;
    const created = createShot('scene_unassigned', order, new Date().toISOString());
    if (entries.some((e) => e.shot.path === created.path)) {
      setError(`${created.path} already exists`);
      return;
    }
    setBusy(true);
    setError(null);
    writeNote(project.root, created.path, created.source)
      .then(async () => {
        await load(project.root);
        select(created.path);
      })
      .catch((e: unknown) => {
        setError(typeof e === 'string' ? e : e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        setBusy(false);
      });
  };

  const copyPrompt = () => {
    if (!compiled) return;
    void navigator.clipboard.writeText(compiled.result.prompt).then(
      () => {
        setCopied(true);
      },
      () => {
        setError('could not write to the clipboard');
      },
    );
  };

  if (!isDesktop()) {
    return (
      <div className="placeholder">
        <h1>STUDIO</h1>
        <p className="browser-warning">{BROWSER_ONLY_MESSAGE}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="placeholder">
        <h1>STUDIO</h1>
        <p className="hint">Open a project in WORLD first; STUDIO follows the same vault.</p>
      </div>
    );
  }

  return (
    <div className="workspace">
      <div className="view-bar">
        <span className="project-name">{project.name}</span>
        <span className="hint">
          {entries.length} shot{entries.length === 1 ? '' : 's'}
        </span>
        <span className="spacer" />
        {dirty && <span className="dirty-dot" title="Unsaved changes" />}
        <button disabled={busy} onClick={addShot}>
          New shot
        </button>
        <button disabled={!dirty || busy} onClick={save}>
          Save
        </button>
      </div>

      <div className="vault">
        <aside className="navigator">
          <h3>Shots</h3>
          <ul className="scene-list">
            {entries.length === 0 && (
              <li className="hint">
                No shots yet. A shot is a <code>type: shot</code> note under
                <code> Studio/Shots</code>.
              </li>
            )}
            {entries.map(({ shot }) => (
              <li key={shot.path}>
                <button
                  className={shot.path === selected ? 'note active' : 'note'}
                  onClick={() => {
                    select(shot.path);
                  }}
                >
                  <span className="note-title">
                    <span className="scene-number">{shot.order}</span>
                    {shot.id === '' ? shot.path : shot.id}
                  </span>
                  <span className="snippet">
                    {shot.purpose === '' ? 'no purpose recorded' : shot.purpose}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="editor">
          {error !== null && <p className="error">{error}</p>}
          {!active ? (
            <div className="placeholder">
              <p className="hint">Select a shot to write its description.</p>
            </div>
          ) : (
            <>
              <div className="prompt-head">
                <h3>Description</h3>
                <span className="hint">
                  Refer to references as <code>{'{{ref:id}}'}</code> — labels are numbered at
                  compile time.
                </span>
              </div>
              <MarkdownEditor
                path={active.shot.path}
                source={body}
                onChange={(contents) => {
                  setDraft(contents);
                  setDirty(true);
                }}
                onSave={save}
              />
              {compiled && (
                <div className="compiled">
                  <div className="prompt-head">
                    <h3>
                      Compiled H3 prompt <span className="mode-badge">{compiled.result.mode}</span>
                    </h3>
                    <button onClick={copyPrompt}>{copied ? 'Copied' : 'Copy'}</button>
                  </div>
                  <pre className="h3-prompt">{compiled.result.prompt}</pre>
                </div>
              )}
            </>
          )}
        </section>

        <aside className="inspector">
          {active && compiled ? (
            <>
              <h3>Render</h3>
              <ul className="attachments">
                <li>mode {compiled.result.mode}</li>
                <li>
                  {compiled.result.frames} frames ({compiled.result.durationSeconds.toFixed(2)}s)
                </li>
                <li>{Object.keys(compiled.result.labels).length} references</li>
              </ul>

              {Object.keys(compiled.result.labels).length > 0 && (
                <>
                  <h3>Reference labels</h3>
                  <dl className="properties">
                    {Object.entries(compiled.result.labels).map(([id, label]) => (
                      <div key={id}>
                        <dt>{label}</dt>
                        <dd>{id}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}

              <h3>Gaps ({compiled.gaps.length})</h3>
              {compiled.gaps.length === 0 ? (
                <p className="hint">The shot records everything H3 needs.</p>
              ) : (
                <ul className="diagnostics">
                  {compiled.gaps.map((gap, i) => (
                    <li key={i} className="diag diag-advisory">
                      <span className="diag-severity">shot</span>
                      <span className="diag-message">{gap}</span>
                    </li>
                  ))}
                </ul>
              )}

              <h3>Prompt warnings ({compiled.result.warnings.length})</h3>
              {compiled.result.warnings.length === 0 ? (
                <p className="hint">Nothing to report.</p>
              ) : (
                <ul className="diagnostics">
                  {compiled.result.warnings.map((w, i) => (
                    <li key={i} className="diag diag-warning">
                      <span className="diag-severity">{w.category}</span>
                      <span className="diag-message">{w.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <h3>STUDIO</h3>
              <p className="hint">
                Shots stay renderer-neutral. The H3 prompt is compiled from the shot every time it
                is shown, so it is never stored and never goes stale.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
