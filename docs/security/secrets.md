# Secrets

- Stored only in OS-backed secure storage (Stronghold or platform equivalent).
- Never in project YAML, Markdown, logs, generation packets, crash reports, or Git.
- Redacted from structured logs and error displays.
- Diagnostic bundle export excludes secrets by default.
