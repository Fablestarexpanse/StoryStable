# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Version domains are tracked separately per spec §15: app version, project format
version, schema versions, workflow adapter versions, prompt/compiler versions,
and agent definition versions.

## [Unreleased]

### Added

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
