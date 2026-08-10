# StoryStable

A local-first desktop production environment for worldbuilding, writing, and
AI-assisted animation. Markdown world knowledge, scene intent, visual
references, generated media, review, and editorial assembly share one linked
production model — while staying ordinary files you can read in any editor.

**Primary flow:** WORLD → STORY → STUDIO → CUT

> **Status:** in development. WORLD is usable today; STORY, STUDIO, and CUT are
> scaffolded but not yet implemented. See [ROADMAP.md](ROADMAP.md) for exactly
> what is done and what is not.

---

## Why it works this way

Four decisions shape everything else:

- **Your files are the truth.** World notes are plain `.md` with YAML
  frontmatter; canvases are [JSON Canvas](https://jsoncanvas.org); the edit
  will be OpenTimelineIO. The SQLite index is a disposable cache that can be
  rebuilt from the files at any time. Delete it and nothing is lost.
- **Renderer-neutral production intent.** A Shot stores camera, performance,
  sound, and reference _roles_ — never a renderer's prompt syntax. Those are
  compiled at render time, so switching renderers doesn't rewrite your project.
- **Agents propose; you own canon.** Model output is a reviewable proposal.
  Writes are hash-guarded: if a note changed after a proposal was made, the
  apply is refused rather than silently overwriting your newer version.
- **No silent cloud.** The routing policy is enforced before any network call,
  and the destination is shown before you send. API keys live in the OS
  credential manager and never enter the webview.

---

## What works today

### WORLD workspace

| View          | What it does                                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **notes**     | Folder tree navigator with create-folder / create-note / create-from-template; CodeMirror Markdown editor with Ctrl+S atomic save |
| **table**     | Property view over frontmatter — filter, sort, group, choose columns, inline edit that writes back to the file, CSV export        |
| **graph**     | Force-directed knowledge graph, typed nodes, hover neighborhood focus, click to open                                              |
| **timeline**  | World chronology with lenient fictional-date parsing, lifespans and eras, chronology conflict warnings                            |
| **knowledge** | Truth / character-knowledge / audience-knowledge matrix with false-belief detection and per-character spoiler sets                |
| **canvas**    | JSON Canvas board — pan, zoom, drag, text and note cards                                                                          |
| **health**    | Frontmatter errors, broken links, orphans, duplicate IDs, missing embeds, chronology and relationship issues, SQLite integrity    |

Plus: SQLite FTS5 full-text search with snippets, a file watcher that
live-refreshes on external edits, wikilinks with backlinks and alias
resolution, typed directional relationships with reciprocity checks, and
attachment tracking.

### Assistant

Four read-only, review-gated agents — Writing Partner, Canon Keeper, Character
Director, Continuity Supervisor. None is bound to a model.

- **Providers:** Anthropic, OpenRouter, and local servers (Ollama, LM Studio).
  Cloud keys live in the OS credential manager; local servers need none.
  OpenRouter's catalogue is fetched live, so any checkpoint your account can
  reach is selectable, and local catalogues come from the running server.
  Choosing a local provider means project content never leaves the machine —
  which is what makes the **Local only** routing policy meaningful.
- **Context Inspector:** every item that will be sent, with token estimates and
  per-item toggles.
- **Spoiler guard:** set a point-of-view character and facts that character
  does not know are withheld from context and named in the prompt — so an agent
  writing that character cannot leak a reveal the audience has already seen.

---

## Getting started

**Prerequisites:** Node.js 20+, Rust stable, and the
[Tauri 2 platform prerequisites](https://tauri.app/start/prerequisites/)
(on Windows: MS C++ Build Tools and WebView2, usually already present).

```bash
npm install
npm run dev
```

`npm run dev` opens the desktop app. On first run, point it at a folder to
create a vault, or open an existing one — recent projects are remembered.

> Opening `http://localhost:1420` in a browser renders the UI but has no
> connection to the vault: Tauri IPC only exists in the desktop window. The app
> says so rather than failing cryptically.

### Commands

| Command                                                    | What it does                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------ |
| `npm run dev`                                              | Desktop app (Tauri + Vite)                                   |
| `npm run dev:web`                                          | Vite only, for layout work in a browser                      |
| `npm run verify`                                           | Format check, lint, typecheck, unit tests, schema validation |
| `npm test`                                                 | Unit tests                                                   |
| `npm run build`                                            | Frontend bundle                                              |
| `cargo test --all`                                         | Rust tests                                                   |
| `cargo clippy --all-targets --all-features -- -D warnings` | Rust lint                                                    |

---

## Layout

```text
apps/desktop        Tauri 2 + React app
  src/              React UI (workspaces, views, service boundary)
  src-tauri/        Rust: vault IO, SQLite index, watcher, agents, secrets
packages/vault      Pure domain layer — no filesystem, no network
packages/schemas    JSON Schema 2020-12 contracts + validation harness
docs/               Product, architecture, data, agents, render, security
scripts/            Dev tooling
```

**Boundaries** (enforced by review, see
[docs/architecture/overview.md](docs/architecture/overview.md)): the domain
layer imports no provider SDKs; the UI never touches SQLite; provider adapters
never write project files; schema validation happens at every persistence and
external boundary.

The privileged split matters for security: all filesystem access, the SQLite
index, and every outbound API call live in Rust. Project content is untrusted
input — a prompt injection inside a note must not be able to reach a
credential, so credentials never enter the webview at all.

---

## Project format

A vault is an ordinary folder:

```text
MyWorld/
├── project.yaml
├── World/          Characters, Locations, Factions, History, Rules, …
├── Story/          Premise, Outline, Sequences, Scenes, Branches
├── Production/     Moments, Shots, ReferenceSets, Takes, StateSnapshots
├── Canvases/       JSON Canvas files
├── References/     Character, Environment, Style, Motion, Voice, …
├── Media/          Images, Video, Audio, Proxies, Thumbnails
├── Edit/           master.otio, autosaves, exports
└── .project/       Disposable index, cache, logs (safe to delete)
```

Stable IDs never depend on filenames, so renaming a note doesn't break
identity. See [docs/data/project-format.md](docs/data/project-format.md).

---

## Documentation

| Document                                                       | Purpose                                            |
| -------------------------------------------------------------- | -------------------------------------------------- |
| [ROADMAP.md](ROADMAP.md)                                       | Phase status and per-item acceptance criteria      |
| [AGENTS.md](AGENTS.md)                                         | Binding contract for AI coding agents in this repo |
| [CONTRIBUTING.md](CONTRIBUTING.md)                             | Setup, workflow, commit conventions                |
| [SECURITY.md](SECURITY.md)                                     | Security baseline and reporting                    |
| [CHANGELOG.md](CHANGELOG.md)                                   | Notable changes                                    |
| [docs/specs/build-spec-v0.2.md](docs/specs/build-spec-v0.2.md) | Authoritative build specification                  |

---

## Status by phase

| Phase                       | State       |
| --------------------------- | ----------- |
| 0 — Repository & guardrails | Done        |
| 1 — Vault foundation        | Done        |
| 2 — Structured world        | Done        |
| 3 — Agents                  | Done        |
| 4 — Story                   | Not started |
| 5 — Studio / images         | Not started |
| 6 — MiniMax H3              | Not started |
| 7 — Cut                     | Not started |
| 8 — Intelligence / polish   | Not started |

---

## License

UNLICENSED — all rights reserved. Not yet open for redistribution.
