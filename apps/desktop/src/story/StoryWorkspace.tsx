import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  parseFountain,
  parseNote,
  sceneSummaries,
  speakingCharacters,
  linkScenes,
  storyDiagnostics,
  createSceneCapsule,
  formatValue,
  type ParsedNote,
  type ScreenplayElement,
} from '@storystable/vault';
import type { ProjectInfo } from '../services/vault.js';
import {
  listScreenplays,
  listNotes,
  readNote,
  writeNote,
  recentProjects,
  openProject,
  isDesktop,
  BROWSER_ONLY_MESSAGE,
} from '../services/vault.js';
import { MarkdownEditor } from '../world/MarkdownEditor.js';

const DEFAULT_SCREENPLAY = 'Story/master.fountain';

/** The capsule fields worth seeing beside the scene, in reading order. */
const CAPSULE_FIELDS = [
  'intent',
  'character_ids',
  'location_ids',
  'start_state_id',
  'end_state_id',
  'protected_information',
  'status',
] as const;

const STARTER = [
  'Title: Untitled',
  'Author: ',
  '',
  '# Act One',
  '',
  'INT. LOCATION - DAY',
  '',
  'Someone does something.',
  '',
  'CHARACTER',
  'And says something about it.',
  '',
].join('\n');

/**
 * STORY workspace. The screenplay is an ordinary `.fountain` file — this is a
 * view over it, not an import, so raw mode is always one click away (spec
 * §6.2: "A raw Fountain mode must always be available").
 */
export function StoryWorkspace() {
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [path, setPath] = useState(DEFAULT_SCREENPLAY);
  const [source, setSource] = useState('');
  const [draft, setDraft] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [raw, setRaw] = useState(false);
  const [selectedScene, setSelectedScene] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<ParsedNote[]>([]);

  // Reuse the most recent project; STORY has no launcher of its own yet.
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

  const loadFile = useCallback(async (root: string, target: string) => {
    try {
      setSource(await readNote(root, target));
    } catch {
      // A screenplay that does not exist yet opens as a starter template
      // rather than an error — creating one should not need a separate step.
      setSource('');
    }
    setDraft(null);
    setDirty(false);
    setSelectedScene(null);
  }, []);

  // Opening a project picks its first screenplay. Switching files afterwards
  // is the select handler's job, so this effect never depends on `path` —
  // otherwise every keystroke would re-trigger a reload.
  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    listScreenplays(project.root).then(
      (found) => {
        if (cancelled) return;
        setFiles(found);
        const target = found[0] ?? DEFAULT_SCREENPLAY;
        setPath(target);
        void loadFile(project.root, target);
      },
      () => {
        if (!cancelled) setFiles([]);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [project, loadFile]);

  const text = draft ?? source;
  const screenplay = useMemo(() => parseFountain(text), [text]);
  const scenes = useMemo(() => sceneSummaries(screenplay), [screenplay]);
  const characters = useMemo(() => speakingCharacters(screenplay), [screenplay]);
  const links = useMemo(() => linkScenes(screenplay, notes), [screenplay, notes]);
  const diagnostics = useMemo(() => storyDiagnostics(screenplay, notes), [screenplay, notes]);

  const capsuleFor = (line: number) => links.find((l) => l.scene?.line === line)?.capsule ?? null;
  const selected = scenes.find((s) => s.line === selectedScene) ?? null;
  const selectedCapsule = selectedScene === null ? null : capsuleFor(selectedScene);

  const loadNotes = useCallback(async (root: string) => {
    const paths = await listNotes(root);
    setNotes(
      await Promise.all(
        paths.map(async (p) => parseNote({ path: p, source: await readNote(root, p) })),
      ),
    );
  }, []);

  useEffect(() => {
    if (!project) return;
    void loadNotes(project.root);
  }, [project, loadNotes]);

  const addCapsule = () => {
    if (!project || !selected) return;
    const order = scenes.indexOf(selected) + 1;
    const capsule = createSceneCapsule(selected, order, new Date().toISOString());
    if (notes.some((n) => n.path === capsule.path)) {
      setError(`${capsule.path} already exists`);
      return;
    }
    setBusy(true);
    setError(null);
    writeNote(project.root, capsule.path, capsule.source)
      .then(() => loadNotes(project.root))
      .catch((e: unknown) => {
        setError(typeof e === 'string' ? e : e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        setBusy(false);
      });
  };

  const save = () => {
    if (!project || draft === null) return;
    setBusy(true);
    setError(null);
    writeNote(project.root, path, draft)
      .then(async () => {
        setSource(draft);
        setDirty(false);
        setFiles(await listScreenplays(project.root));
      })
      .catch((e: unknown) => {
        setError(typeof e === 'string' ? e : e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        setBusy(false);
      });
  };

  if (!isDesktop()) {
    return (
      <div className="placeholder">
        <h1>STORY</h1>
        <p className="browser-warning">{BROWSER_ONLY_MESSAGE}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="placeholder">
        <h1>STORY</h1>
        <p className="hint">Open a project in WORLD first; STORY follows the same vault.</p>
      </div>
    );
  }

  const empty = text.trim() === '';

  return (
    <div className="workspace">
      <div className="view-bar">
        <span className="project-name">{project.name}</span>
        <select
          value={files.includes(path) ? path : ''}
          onChange={(e) => {
            const target = e.target.value === '' ? DEFAULT_SCREENPLAY : e.target.value;
            setPath(target);
            void loadFile(project.root, target);
          }}
        >
          <option value="">{DEFAULT_SCREENPLAY} (new)</option>
          {files.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <nav className="view-switch">
          <button
            className={raw ? 'view' : 'view active'}
            onClick={() => {
              setRaw(false);
            }}
          >
            screenplay
          </button>
          <button
            className={raw ? 'view active' : 'view'}
            onClick={() => {
              setRaw(true);
            }}
          >
            raw fountain
          </button>
        </nav>
        <span className="spacer" />
        {dirty && <span className="dirty-dot" title="Unsaved changes" />}
        <button disabled={!dirty || busy} onClick={save}>
          Save
        </button>
      </div>

      <div className="vault">
        <aside className="navigator">
          <h3>Scenes ({scenes.length})</h3>
          <ul className="scene-list">
            {scenes.length === 0 && <li className="hint">No scene headings yet.</li>}
            {scenes.map((scene) => (
              <li key={`${String(scene.line)}-${scene.heading}`}>
                <button
                  className={scene.line === selectedScene ? 'note active' : 'note'}
                  onClick={() => {
                    setSelectedScene(scene.line);
                  }}
                >
                  <span className="note-title">
                    {scene.sceneNumber !== null && (
                      <span className="scene-number">{scene.sceneNumber}</span>
                    )}
                    {scene.heading}
                  </span>
                  {capsuleFor(scene.line) !== null && (
                    <span className="capsule-dot" title="Has a Scene Capsule" />
                  )}
                  {scene.characters.length > 0 && (
                    <span className="snippet">{scene.characters.join(', ')}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {characters.length > 0 && (
            <>
              <h3>Characters ({characters.length})</h3>
              <ul className="attachments">
                {characters.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </>
          )}
        </aside>

        <section className="editor">
          {error !== null && <p className="error">{error}</p>}
          {empty && !raw ? (
            <div className="placeholder">
              <p className="hint">
                No screenplay at <code>{path}</code> yet.
              </p>
              <button
                onClick={() => {
                  setDraft(STARTER);
                  setDirty(true);
                  setRaw(true);
                }}
              >
                Start a screenplay
              </button>
            </div>
          ) : raw ? (
            <MarkdownEditor
              path={path}
              source={text}
              onChange={(contents) => {
                setDraft(contents);
                setDirty(true);
              }}
              onSave={save}
            />
          ) : (
            <div className="screenplay">
              {Object.keys(screenplay.titlePage).length > 0 && (
                <div className="title-page">
                  {Object.entries(screenplay.titlePage).map(([key, value]) => (
                    <div key={key}>
                      <span className="tp-key">{key}</span> {value}
                    </div>
                  ))}
                </div>
              )}
              {screenplay.elements.map((element, index) => (
                <ScreenplayLine
                  key={index}
                  element={element}
                  highlighted={
                    selectedScene !== null &&
                    element.line >= selectedScene &&
                    element.line <
                      (scenes.find((s) => s.line > selectedScene)?.line ?? Number.MAX_SAFE_INTEGER)
                  }
                />
              ))}
            </div>
          )}
        </section>

        <aside className="inspector">
          {selected ? (
            <>
              <h3>Scene Capsule</h3>
              {selectedCapsule ? (
                <>
                  <p className="capsule-path">{selectedCapsule.path}</p>
                  <dl className="properties">
                    {CAPSULE_FIELDS.map((field) => (
                      <div key={field}>
                        <dt>{field.replace(/_/g, ' ')}</dt>
                        <dd>{formatValue(selectedCapsule.frontmatter[field]) || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="hint">Edit the capsule in WORLD — it is an ordinary note.</p>
                </>
              ) : (
                <>
                  <p className="hint">
                    No capsule for <strong>{selected.heading}</strong>. A capsule carries the
                    scene&rsquo;s purpose and state change; the screenplay keeps the prose.
                  </p>
                  <button disabled={busy} onClick={addCapsule}>
                    Create Scene Capsule
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <h3>Screenplay</h3>
              <ul className="attachments">
                <li>{scenes.length} scenes</li>
                <li>{characters.length} speaking characters</li>
                <li>
                  {screenplay.elements.filter((e) => e.kind === 'dialogue').length} dialogue lines
                </li>
                <li>{screenplay.elements.filter((e) => e.kind === 'note').length} notes</li>
              </ul>
              <p className="hint">
                The file stays valid Fountain — edit it here or in any text editor.
              </p>
            </>
          )}

          <h3>Diagnostics ({diagnostics.length})</h3>
          {diagnostics.length === 0 ? (
            <p className="hint">Nothing to report.</p>
          ) : (
            <ul className="diagnostics">
              {diagnostics.map((d, i) => (
                <li key={i} className={`diag diag-${d.severity}`}>
                  <span className="diag-severity">{d.severity}</span>
                  <span className="diag-where">{d.heading ?? d.path}</span>
                  <span className="diag-message">{d.message}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

function ScreenplayLine({
  element,
  highlighted,
}: {
  element: ScreenplayElement;
  highlighted: boolean;
}) {
  const className = `sp sp-${element.kind}${highlighted ? ' highlighted' : ''}`;
  if (element.kind === 'section') {
    return (
      <div className={className} data-depth={element.depth}>
        {element.text}
      </div>
    );
  }
  if (element.kind === 'scene_heading') {
    return (
      <div className={className}>
        {element.text}
        {element.sceneNumber !== undefined && (
          <span className="scene-number">{element.sceneNumber}</span>
        )}
      </div>
    );
  }
  if (element.kind === 'page_break') return <hr className="sp-page-break" />;
  return <div className={className}>{element.text}</div>;
}
