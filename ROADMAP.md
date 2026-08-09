# ROADMAP

Milestones for v1, derived from §23 of
[docs/specs/build-spec-v0.2.md](docs/specs/build-spec-v0.2.md).

Status values: `NOT STARTED` · `IN PROGRESS` · `BLOCKED` · `DONE` ·
`DONE WITH EXPLICIT WAIVER`.

Each phase item follows the checklist format in spec §24. Agents edit this file
as work proceeds rather than relying on memory.

---

## Phase 0 — Repository & Guardrails

Status: DONE
Owner: agent

Acceptance criteria

- [x] Repository scaffold (npm workspaces + Cargo workspace)
- [x] `AGENTS.md`
- [x] `ROADMAP.md`
- [x] `CHANGELOG.md`
- [x] `CONTRIBUTING.md`
- [x] `SECURITY.md`
- [x] `docs/` skeleton per spec §14
- [x] Formatter (Prettier) configured and enforced
- [x] Linter (ESLint flat config) configured and enforced
- [x] Strict TypeScript typecheck
- [x] Unit test runner (Vitest)
- [x] JSON Schema 2020-12 contracts with valid/invalid fixtures
- [x] Schema validation wired into `npm run verify`
- [x] Tauri 2 + React desktop shell that builds
- [x] Rust fmt/clippy/test gates
- [x] CI baseline (GitHub Actions)
- [x] Security baseline documented (`SECURITY.md`, `docs/security/*`)
- [x] ADR-0001 recorded for the reference authority/use-scope split

Notes

- 2026-08-09: repository seeded with v0.2 spec, v0.1 kept as superseded history.
- 2026-08-09: Phase 0 scaffold landed. Schemas cover the object model in spec
  §5; the H3 compiler, ComfyUI adapter, and index/migration contracts are
  deliberately not schematized yet — they arrive with their own phases.

---

## Phase 1 — Vault Foundation

Status: IN PROGRESS
Owner: agent

Acceptance criteria

- [x] Project create/open (spec §3 layout, atomic writes, path-safety guard)
- [ ] Markdown editor (CodeMirror 6) — current viewer is read-only
- [x] YAML frontmatter parse (never-throwing) — validate/edit UI pending
- [x] Wikilinks (targets, aliases, headings, embeds; code blocks excluded)
- [x] Backlinks — unlinked mentions pending
- [ ] Full-text search (SQLite FTS5)
- [ ] File watcher with incremental indexing
- [ ] SQLite index build and rebuild-from-files
- [ ] Basic knowledge graph
- [ ] Canvas (JSON Canvas compatible)
- [ ] Attachments
- [ ] Project Health panel

Notes

- 2026-08-09: first increment landed. `packages/vault` is the pure domain
  layer (no filesystem access); Rust owns project layout, path safety, and
  atomic IO behind five Tauri commands; WORLD workspace has project
  open/create, note list, viewer, properties, links, and backlinks.
  Link resolution currently rebuilds in-memory on load/refresh — the SQLite
  index replaces that in the next increment.

---

## Phase 2 — Structured World

Status: NOT STARTED
Owner: unassigned

Acceptance criteria

- [ ] WorldEntity schemas enforced end to end
- [ ] Entity templates
- [ ] Property views (table/list/card) writing back to frontmatter
- [ ] Typed, directional relationships
- [ ] World timeline and events
- [ ] Canon status and conflict indicators
- [ ] Reference attachments
- [ ] Truth / character knowledge / audience knowledge model

---

## Phase 3 — Agents

Status: NOT STARTED
Owner: unassigned

Acceptance criteria

- [ ] Model Gateway with routing presets
- [ ] Local and cloud provider adapters
- [ ] Capability registry
- [ ] Context Inspector
- [ ] `AgentPatch` propose/review/apply with stale-patch detection
- [ ] Tool risk levels and permission policy
- [ ] Writing Partner
- [ ] Canon Keeper
- [ ] Character Director
- [ ] Continuity Supervisor

---

## Phase 4 — Story

Status: NOT STARTED
Owner: unassigned

Acceptance criteria

- [ ] Sequences
- [ ] Scenes and Scene Capsules
- [ ] State snapshots
- [ ] Beats
- [ ] Moments
- [ ] Fountain screenplay editor with raw mode
- [ ] Branches and comparison
- [ ] Reveal/knowledge tracking
- [ ] Story diagnostics (warnings, never hard gates)

---

## Phase 5 — Studio / Images

Status: NOT STARTED
Owner: unassigned

Acceptance criteria

- [ ] Asset library with durable metadata
- [ ] Reference sets with role/authority/use-scope
- [ ] Visual exploration canvas
- [ ] Storyboard with frame-exact panel timing
- [ ] Shot objects
- [ ] ComfyUI backend connection
- [ ] Versioned workflow adapters with incompatibility detection
- [ ] Image generation ingest and lineage

---

## Phase 6 — MiniMax H3

Status: NOT STARTED
Owner: unassigned

Acceptance criteria

- [ ] H3 capability profile
- [ ] Mode router (T2VA / I2VA / FL2VA / L2VA / Ref2VA)
- [ ] Duration resolver on the 24fps frame grid
- [ ] Resolution resolver
- [ ] Semantic reference resolver with atomic tag renumbering
- [ ] Base prompt compiler
- [ ] Full-reference prompt compiler
- [ ] H3 preflight
- [ ] FL2VA workflow adapter
- [ ] Ref2VA workflow adapter
- [ ] Queue and progress
- [ ] Take compare
- [ ] Continuation
- [ ] Prompt/packet inspector
- [ ] License/territory acknowledgement gate for local H3

---

## Phase 7 — Cut

Status: NOT STARTED
Owner: unassigned

Acceptance criteria

- [ ] OTIO-backed sequence model
- [ ] Playback and proxies
- [ ] Video/audio tracks
- [ ] Trim / split / ripple
- [ ] Markers
- [ ] Transitions
- [ ] Shot version switching
- [ ] Autosaves
- [ ] FFmpeg preview export
- [ ] OTIO export

---

## Phase 8 — Intelligence / Polish

Status: NOT STARTED
Owner: unassigned

Acceptance criteria

- [ ] Visual continuity assistance
- [ ] Production readiness checks
- [ ] Missing-shot detection
- [ ] Optional semantic search
- [ ] Motion/camera library
- [ ] Batch optimization by model family
- [ ] Cost/time estimates
- [ ] Project diagnostics bundle
