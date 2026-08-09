# Contributing

## Prerequisites

- Node.js 20+ (developed against 25.x)
- Rust stable (developed against 1.91)
- Platform prerequisites for Tauri 2 — see
  <https://tauri.app/start/prerequisites/>

## Setup

```bash
npm install
```

## Everyday commands

| Command                   | What it does                                      |
| ------------------------- | ------------------------------------------------- |
| `npm run dev`             | Run the desktop app in development (Tauri + Vite) |
| `npm run build`           | Build the frontend bundle                         |
| `npm run format`          | Rewrite files with Prettier                       |
| `npm run format:check`    | Fail if formatting is off                         |
| `npm run lint`            | ESLint over the workspace                         |
| `npm run typecheck`       | Strict TypeScript across all packages             |
| `npm test`                | Vitest unit tests                                 |
| `npm run schema:validate` | Validate schemas and fixtures                     |
| `npm run verify`          | All of the above gates, in CI order               |

Rust:

```bash
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --all
```

## Workflow

1. Read `AGENTS.md` — it is binding for humans and AI agents alike.
2. Pick the active phase item from `ROADMAP.md` and mark it `IN PROGRESS`.
3. Make the smallest coherent change.
4. Update schemas before writing data that violates them; add migrations before
   changing persisted formats.
5. Update docs in the same change as the behavior change.
6. Run `npm run verify` (plus the Rust gates when Rust changed).
7. Update `CHANGELOG.md` if the change is user-visible or notable.
8. Tick the `ROADMAP.md` checkboxes you actually completed.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(studio): add H3 reference resolver
fix(canon): prevent stale agent patch application
docs(h3): document reference budget
refactor(render): isolate ComfyUI adapter
test(schemas): add board panel duration fixtures
chore(ci): pin actions to commit SHAs
```

Scopes generally match a workspace or subsystem: `world`, `story`, `studio`,
`cut`, `schemas`, `render`, `h3`, `comfy`, `agents`, `index`, `security`, `ci`.

## Architecture rules

Enforced by review, and eventually by lint:

- The domain model must not import ComfyUI, H3, or LLM provider SDKs.
- The UI must not mutate SQLite directly.
- Provider adapters must not write project files directly.
- Agent writes go through the patch service.
- Schema validation happens at every persistence and external boundary.

## Architectural decisions

Significant decisions get an ADR in `docs/architecture/decisions/`, numbered
`ADR-NNNN-short-title.md`. Copy the format of the existing records.

## Quality gates

Never disable a failing gate to merge. Fix it, document an explicit temporary
waiver in `ROADMAP.md`, or revert the risky change.
