# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Version domains are tracked separately per spec §15: app version, project format
version, schema versions, workflow adapter versions, prompt/compiler versions,
and agent definition versions.

## [Unreleased]

### Added

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
