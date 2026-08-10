import { useState } from 'react';
import { WorldWorkspace } from './world/WorldWorkspace.js';
import { StoryWorkspace } from './story/StoryWorkspace.js';
import { StudioWorkspace } from './studio/StudioWorkspace.js';

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
        {active === 'WORLD' ? (
          <WorldWorkspace />
        ) : active === 'STORY' ? (
          <StoryWorkspace />
        ) : active === 'STUDIO' ? (
          <StudioWorkspace />
        ) : (
          <div className="placeholder">
            <h1>{active}</h1>
            <p>{DESCRIPTIONS[active]}</p>
            <p className="hint">Arrives in a later phase — see ROADMAP.md.</p>
          </div>
        )}
      </main>
    </div>
  );
}
