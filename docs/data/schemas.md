# Schemas

Canonical validation contract: **JSON Schema 2020-12** (spec section 4).

Implementation lives in [`packages/schemas`](../../packages/schemas):

- `schemas/*.schema.json` - one file per durable object type, each with
  `$schema`, `$id` (`urn:storystable:<name>`), `title`, `description`.
- `src/registry.ts` - ajv-based registry that compiles all schemas and
  resolves internal `$ref`s.
- `fixtures/valid/` and `fixtures/invalid/` - every schema has at least one
  positive fixture; contract-critical mistakes have negative fixtures.
- Tests assert that all schemas compile, all valid fixtures pass, and all
  invalid fixtures fail for the expected reason.

Rules: shared objects are defined once and referenced; TypeScript types are
derived from schemas or validated at boundaries; internal machine objects use
`additionalProperties: false`; frontmatter is permissive only where extension
is intentional.
