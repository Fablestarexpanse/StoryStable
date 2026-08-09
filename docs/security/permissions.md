# Permissions

Tauri capabilities are least-privilege per window/webview: only needed
filesystem/process/network permissions, scoped to selected project roots and
app data. No generic shell execution exposed to the frontend.

The desktop shell capability files live in
`apps/desktop/src-tauri/capabilities/` and are reviewed under the
security-permissions row of the change-impact matrix (AGENTS.md): security +
E2E tests, docs, changelog, and an ADR.
