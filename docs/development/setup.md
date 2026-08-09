# Development Setup

1. Install Node.js 20+ and Rust stable.
2. Install Tauri 2 platform prerequisites: <https://tauri.app/start/prerequisites/>
   (on Windows: Microsoft C++ Build Tools and WebView2, usually preinstalled).
3. `npm install` at the repo root.
4. `npm run verify` to confirm the toolchain works.
5. `npm run dev` to launch the desktop app.

Workspace layout:

```text
apps/desktop        Tauri 2 + React application shell
packages/schemas    JSON Schema 2020-12 contracts + validation harness
docs/               product, architecture, data, agents, render, security docs
```
