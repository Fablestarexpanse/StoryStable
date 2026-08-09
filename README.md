# StoryStable

An AI-native animation & worldbuilding production OS: a local-first desktop
environment where Markdown world knowledge, screenplay/scene intent, visual
references, generated media, MiniMax H3 / ComfyUI rendering, review, and
editorial assembly share one linked production model.

**Primary flow:** WORLD → STORY → STUDIO → CUT

## Status

Phase 0 (repository & guardrails) is in place: monorepo scaffold, schema
contracts with fixtures, a Tauri 2 + React shell, and CI quality gates.
Phase 1 (vault foundation) is next — see [ROADMAP.md](ROADMAP.md).

## Getting started

```text
npm install        # setup
npm run verify     # format, lint, typecheck, tests, schema validation
npm run dev        # launch the desktop shell
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full command set and
[AGENTS.md](AGENTS.md) for the binding coding-agent contract.

## Documentation

| Document                                                           | Purpose                                                                                                                      |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| [docs/specs/build-spec-v0.2.md](docs/specs/build-spec-v0.2.md)     | **Current** consolidated build specification (product, architecture, schemas, H3/ComfyUI contracts, coding-agent governance) |
| [docs/specs/build-spec-v0.1.md](docs/specs/build-spec-v0.1.md)     | Superseded v0.1 master build spec, kept for history                                                                          |
| [docs/specs/VALIDATION_REPORT.md](docs/specs/VALIDATION_REPORT.md) | Contract/package validation results for the v0.2 planning package                                                            |

`build-spec-v0.2.md` is authoritative where the two specs disagree.

## Next steps

Per §30 of the spec: start at Phase 0 (repository scaffold, `AGENTS.md`,
`ROADMAP.md`, `CHANGELOG.md`, docs skeleton, CI baseline) and Phase 1 (vault
foundation) — not video generation.
