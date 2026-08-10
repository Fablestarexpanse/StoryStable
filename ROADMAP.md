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

Status: DONE
Owner: agent

Acceptance criteria

- [x] Project create/open (spec §3 layout, atomic writes, path-safety guard)
- [x] Markdown editor (CodeMirror 6, Ctrl+S save through atomic writes)
- [x] YAML frontmatter parse (never-throwing) — validate/edit UI pending
- [x] Wikilinks (targets, aliases, headings, embeds; code blocks excluded)
- [x] Backlinks — unlinked mentions pending
- [x] Full-text search (SQLite FTS5, bm25 ranking, snippets, injection-safe)
- [x] File watcher with incremental indexing (`vault-changed` events)
- [x] SQLite index build and rebuild-from-files (versioned via user_version)
- [x] Basic knowledge graph (typed nodes, degree sizing, hover focus, orphans)
- [x] Canvas (JSON Canvas compatible, unknown keys preserved on round-trip)
- [x] Attachments (listing with kind/size, embed resolution + missing-embed
      health check)
- [x] Project Health panel (frontmatter errors, broken links, orphans,
      duplicate IDs, SQLite integrity)

Notes

- 2026-08-09: first increment landed. `packages/vault` is the pure domain
  layer (no filesystem access); Rust owns project layout, path safety, and
  atomic IO behind five Tauri commands; WORLD workspace has project
  open/create, note list, viewer, properties, links, and backlinks.
- 2026-08-09: second increment landed. SQLite FTS5 index at
  `.project/index.sqlite` (rebuildable cache, fails loudly on
  newer-than-supported version), notify-based watcher with incremental
  upsert/remove, search UI with snippets, CodeMirror 6 editor with
  dirty-state save. Index title extraction is deliberately minimal in Rust —
  the TS domain layer stays the owner of rich parsing (see
  docs/data/schemas.md boundary note).
- 2026-08-09: third increment landed. Knowledge graph (buildGraph domain +
  force-layout SVG view with kind colors, degree sizing, hover neighborhood
  focus, click-to-open) and Project Health (computeHealth domain: frontmatter
  errors / broken links / orphans / duplicate IDs, merged with Rust
  index_health). Remaining for Phase 1: JSON Canvas and attachments.
- 2026-08-09: fourth increment landed — Phase 1 acceptance criteria complete.
  JSON Canvas parse/serialize preserves unknown and namespaced keys so files
  written by other editors survive our save; canvas view supports pan, zoom,
  drag, text/note cards, and delete. Attachments are listed with kind and
  size, and embeds resolve against them with a `missing-embed` health finding.
  Known gaps carried forward (not Phase 1 criteria): canvas edges are
  preserved but not yet drawn or editable in the UI; the Markdown editor has
  no live preview; unlinked mentions are still pending.

---

## Phase 2 — Structured World

Status: DONE
Owner: agent

Acceptance criteria

- [x] WorldEntity schemas enforced end to end (browser validator, per-row
      schema badge in the property table)
- [x] Entity templates (11 built-in types, schema-valid by construction)
- [x] Property views writing back to frontmatter (table with filter/sort/
      group/columns/CSV; card view pending)
- [x] Typed, directional relationships (resolution by id/title, reciprocity
      checks, inspector display)
- [x] World timeline and events (lenient fictional-date parsing, spans,
      eras, chronology conflict warnings)
- [x] Canon status and conflict indicators (status + canon_level badges;
      conflicts surface through Project Health categories)
- [x] Reference attachments (delivered in Phase 1)
- [x] Truth / character knowledge / audience knowledge model (state snapshots,
      per-observer resolution, false-belief detection, spoiler sets)

Notes

- 2026-08-09: first increment. Schemas are now browser-usable via a static
  `definitions` map and a `@storystable/schemas/browser` entry, with a drift
  test asserting the static list and its content never diverge from the
  `schemas/` directory. Frontmatter edits go through a yaml Document so key
  order and comments survive. Property table supports inline editing,
  filtering, sorting, grouping, column selection, and CSV export.
- 2026-08-09: second increment. Typed relationships resolve by frontmatter
  `id` or title, with symmetric/inverse reciprocity checks surfaced as
  Project Health advisories (rumored and custom relations are exempt).
  Timeline parses invented calendars leniently — bare years, ISO dates on the
  same year scale, `c.`/`~`/`?` uncertainty, ranges, BC suffixes — and keeps
  unparseable dates as visible unordered labels instead of dropping them.
  Chronology conflicts downgrade to advisory when the lifespan date is
  itself uncertain.
- 2026-08-09: third increment completes Phase 2. The truth/knowledge model
  keeps world truth, per-character belief, and audience knowledge as three
  distinct layers, resolves state at any story position, detects false
  beliefs against recorded truth, and derives spoiler sets (what the audience
  knows that a character does not) — the substrate Phase 3 agents need to
  avoid omniscient dialogue. Knowledge regression is reported as an advisory
  question rather than an error, since deliberate forgetting is legitimate.
  Known gap carried forward: beliefs are only checkable against world truth
  when the fact key matches a flattened `entity.property` path; free-form
  fact keys are recorded and displayed but cannot be truth-compared.

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
