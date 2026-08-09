import { useState } from 'react';

const WORKSPACES = ['WORLD', 'STORY', 'STUDIO', 'CUT'] as const;
type Workspace = (typeof WORKSPACES)[number];

const DESCRIPTIONS: Record<Workspace, string> = {
  WORLD: 'Canon, notes, graph, relationships, timeline, research, references.',
  STORY: 'Screenplay, outline, sequences, scenes, beats, moments, branches, reveals.',
  STUDIO: 'Visual development, boards, shots, references, ComfyUI, H3, takes, review.',
  CUT: 'Animatic/edit, audio, versions, markers, review, export.',
};

export function App() {
  const [active, setActive] = useState<Workspace>('WORLD');

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">StoryStable</span>
        <nav className="workspaces">
          {WORKSPACES.map((ws) => (
            <button
              key={ws}
              className={ws === active ? 'tab active' : 'tab'}
              onClick={() => {
                setActive(ws);
              }}
            >
              {ws}
            </button>
          ))}
        </nav>
      </header>
      <main className="stage">
        <h1>{active}</h1>
        <p>{DESCRIPTIONS[active]}</p>
        <p className="hint">Phase 0 shell — vault foundation lands in Phase 1.</p>
      </main>
    </div>
  );
}
