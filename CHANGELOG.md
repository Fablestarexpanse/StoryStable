# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Version domains are tracked separately per spec §15: app version, project format
version, schema versions, workflow adapter versions, prompt/compiler versions,
and agent definition versions.

## [Unreleased]

### Added

- Recent projects: opened and created vaults are remembered in the OS
  app-config directory (never inside a vault) and listed on the launch screen
  for one-click reopening, with duplicate-path collapsing across Windows path
  spellings, a "missing" marker when a folder has moved, and per-entry
  removal. A corrupt or unreadable recents file degrades to an empty list
  rather than blocking project opening.
- Phase 3 (third increment, completes Phase 3): local providers. Ollama and
  LM Studio are reachable through their shared OpenAI-compatible endpoint and
  classified Local, so the Local Only routing policy now routes instead of
  refusing everything, and no credential is involved. Provider selection is
  now explicit on the request — local model ids are indistinguishable from
  first-party ones, so inferring from the id was not sound. Connection
  failures name the server and address rather than surfacing a socket error.
- Phase 3 (second increment): agents can propose edits. The target note's
  hash is captured before the request, the response is shown as a line diff
  with collapsed unchanged context, and applying re-checks the hash — a note
  changed since the proposal is refused rather than overwritten. An
  accidental code fence around returned file contents is stripped. Nothing
  is written until the change has been reviewed.
- Phase 3 (first increment): agent system. Provider credentials stored in the
  OS credential manager, never returned to the webview and redacted from
  provider errors; Model Gateway with a capability registry and routing
  policies that refuse cloud use under Local Only rather than falling back
  silently, with the destination shown before sending; Anthropic adapter
  calling the Messages API from Rust over raw HTTP with `claude-opus-5`,
  omitting parameters the current model family rejects and treating a
  `refusal` stop reason as an error rather than an empty answer; context
  assembly that includes the focus note, its links, and locked canon, and
  withholds facts a point-of-view character does not know; four read-only,
  review-gated agents (Writing Partner, Canon Keeper, Character Director,
  Continuity Supervisor); Context Inspector with per-item toggles, token
  estimates, and a list of withheld facts.
- Phase 2 (third increment, completes Phase 2): truth / character knowledge /
  audience knowledge model. State snapshots are parsed, ordered by scene, and
  resolved into world state and per-observer knowledge at any story position;
  beliefs are classified as known, unknown, or false belief against recorded
  world truth; spoiler sets list what the audience knows that a given
  character does not. Integrity checks (unanchored snapshots, duplicate
  positions, unknown observers, knowledge regression) feed Project Health.
  New knowledge matrix view with a story-position selector, plus status and
  canon-level badges in the inspector.
- Phase 2 (second increment): typed directional relationships parsed from
  frontmatter, resolved by stable id or title, with symmetric and inverse
  reciprocity checks reported as Project Health advisories; relationships
  shown in the inspector in both directions. World timeline with lenient
  fictional-date parsing (bare years, ISO dates mapped onto the same year
  scale, `c.`/`~`/`?` uncertainty, ranges, BC suffixes), lifespan and faction
  spans, era filtering, and chronology conflict detection that softens to
  advisory when the underlying date is uncertain.
- Phase 2 (first increment): browser-safe schema validation
  (`@storystable/schemas/browser`) backed by static schema imports, with a
  drift test that fails if the static list or its content diverges from the
  `schemas/` directory; 11 entity templates that are schema-valid by
  construction, with stable type-prefixed IDs independent of filenames;
  comment- and order-preserving frontmatter updates; property table view with
  inline cell editing that writes back to note files, filtering, sorting,
  grouping, column selection, CSV export, and a per-row schema-validity badge.
- Phase 1 (fourth increment, completes Phase 1): JSON Canvas support —
  never-throwing parser that skips malformed nodes/edges, rejects duplicate
  ids and dangling edges, and preserves unknown/namespaced keys on nodes,
  edges, and root so other editors' data survives a save; Rust canvas
  read/write/list with atomic writes and extension guards; WORLD canvas view
  with pan, zoom, node dragging, text and note cards, and delete.
  Attachments — `list_attachments` classifying media by kind with sizes,
  inspector listing, and a `missing-embed` health finding for `![[...]]`
  targets absent from the vault.
- Phase 1 (third increment): knowledge graph — `buildGraph` domain function
  (typed nodes from `entity_type`/folder, deduplicated edges, degree, orphan
  detection) and a force-directed SVG view with hover neighborhood focus and
  click-to-open; Project Health — `computeHealth` domain function
  (frontmatter errors, broken links, orphans, duplicate stable IDs, sorted
  by severity) rendered with index integrity from the Rust side; WORLD view
  switcher (notes / graph / health) with a problem-count badge.
- Phase 1 (second increment): SQLite FTS5 index (`.project/index.sqlite`) —
  versioned schema, full rebuild from files, incremental upsert/remove,
  bm25-ranked search with snippets and operator-injection-safe queries;
  notify-based file watcher emitting `vault-changed`; WORLD search box;
  CodeMirror 6 Markdown editor with Ctrl+S atomic save; `index_health`
  command reporting note count and SQLite integrity.
- Phase 1 (first increment): `packages/vault` domain layer — never-throwing
  YAML frontmatter parsing, wikilink extraction (aliases, headings, embeds,
  code-block exclusion), case-insensitive link resolution, backlink index.
- Rust vault services: project create/open with the spec §3 folder layout,
  path-safety guard against root escape, atomic writes (temp → flush →
  rename), note list/read/write Tauri commands.
- WORLD workspace: project open/create panel, note navigator, note viewer,
  properties/links/backlinks inspector.

- Phase 0 repository scaffold: npm workspaces, Cargo workspace, strict
  TypeScript, Prettier, ESLint flat config, Vitest.
- `packages/schemas`: JSON Schema 2020-12 contracts for the production object
  model (world entity, state snapshot, scene, moment, board panel, shot,
  reference set, generation packet, render job, take, assembly clip, agent
  patch) with an ajv-based registry, valid/invalid fixtures, and tests.
- `apps/desktop`: Tauri 2 + React + TypeScript application shell with
  least-privilege capabilities.
- Coding-agent governance: `AGENTS.md`, `ROADMAP.md`, `CONTRIBUTING.md`,
  `SECURITY.md`, and the `docs/` skeleton required by spec §14.
- CI baseline running format, lint, typecheck, unit tests, schema validation,
  Rust fmt/clippy/test, and the frontend build.
- Build specification v0.2 (authoritative), v0.1 (superseded), and the v0.2
  planning-package validation report under `docs/specs/`.
