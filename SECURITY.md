# Security Policy

This is a local-first desktop application. The security baseline follows
OWASP ASVS concepts adapted for a desktop app with local services, per spec
§12 of `docs/specs/build-spec-v0.2.md`. The detailed threat model lives in
`docs/security/threat-model.md`.

## Reporting a vulnerability

Open a private security advisory on GitHub
(<https://github.com/Fablestarexpanse/StoryStable/security/advisories/new>)
rather than a public issue. Include reproduction steps and affected versions.

## Baseline commitments

**Tauri surface**

- Least-privilege capabilities per window/webview; only needed filesystem,
  process, and network permissions are enabled.
- Filesystem access is scoped to selected project roots and app data.
- No generic arbitrary shell execution is exposed to the frontend.

**Secrets**

- API keys and tokens live in OS-backed secure storage, never in project YAML,
  Markdown, logs, generation packets, crash reports, or Git.
- Secrets are redacted from structured logs and error displays.
- Diagnostic bundles exclude secrets by default.

**Project file safety**

- Atomic writes (temp file → flush → rename).
- Automatic backups before schema migrations and risky bulk operations.
- Path validation prevents escaping the project root; symlinks and network
  paths are treated carefully.
- Scripts embedded in Markdown/canvas content are never auto-executed.
- Rendered Markdown/HTML is sanitized.

**Agent safety**

- Agents are read-only by default; writes are reviewable patches.
- Destructive operations require explicit confirmation.
- Imported agent/tool definitions are untrusted until approved.
- A model can never change its own permissions.
- Prompt injection inside project or research content must not grant tools or
  override policy.

**ComfyUI / render safety**

- Imported custom nodes and workflows are treated as code-bearing dependencies.
- Workflow adapters carry a trusted/untrusted state.
- Custom nodes are never auto-installed without explicit user approval.

**Privacy modes**

- Local Only / Local First / Cloud Allowed, with routing decisions visible in
  job metadata. No silent local→cloud fallback.
