# ADR-0001: Separate reference authority from transfer/use scope

Status: Accepted
Date: 2026-08-09

## Context

In build-spec v0.1 (§5.6), a ReferenceSet entry's `authority` field mixed two
concepts: how binding a reference is (`locked`, `strong`, `guidance`,
`inspiration`) and _which traits_ of the reference should transfer
(`motion_only`, `voice_only`). A camera-motion reference could not be both
"strongly binding" and "motion only," and the enum would have had to grow a
combinatorial set of values (`locked_voice_only`, …).

Build-spec v0.2 (§5.7) resolves this by splitting the axes:

- `authority`: `locked` | `strong` | `guidance` | `inspiration`
- `use_scope`: `full` | `identity_only` | `appearance_only` | `motion_only` |
  `camera_only` | `voice_only` | `style_only` | `composition_only` |
  `audio_only`

## Decision

The project model uses the v0.2 split. `authority` expresses bindingness only;
`use_scope` expresses which traits transfer. The two are independent fields on
every ReferenceSet entry, validated by
`packages/schemas/schemas/reference-set.schema.json`. `exclude_traits` remains
available for explicit anti-bleed intent.

Anything reading v0.1 must not treat `motion_only`/`voice_only` as authority
values; fixtures include a negative case
(`reference-set-invalid-authority`) that rejects exactly that mistake.

## Consequences

- The H3 reference resolver can express "copy the camera move, nothing else"
  as `authority: strong, use_scope: camera_only` without enum explosion.
- Renderer-specific reference semantics stay out of the project model; the
  compiler maps `use_scope` to renderer-specific anti-bleed prompt text.
- Migration concern is nil today (no v0.1 projects exist), but any future
  importer of v0.1-shaped data must map `authority: motion_only` →
  `authority: strong, use_scope: motion_only` and `voice_only` likewise.
