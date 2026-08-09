# Architecture Overview

Layering (spec section 26):

```text
UI / Presentation
       |
Application Use Cases
       |
Domain Model
       |
Ports / Interfaces
       |
Adapters (Filesystem, SQLite, LLM providers, MCP, ComfyUI, H3 compiler, FFmpeg, OTIO)
```

Hard rules:

- Domain model cannot import ComfyUI/H3/provider SDKs.
- UI cannot mutate SQLite directly.
- Provider adapters cannot write project files directly.
- Agent writes go through project services / patch service.
- Render output ingestion goes through the asset/lineage service.
- Schema validation happens at all persistence/external boundaries.

Technology baseline (spec section 27): Tauri 2 + Rust backend; React + strict
TypeScript; CodeMirror 6; Markdown/YAML + JSON Schema 2020-12; SQLite + FTS5;
FFmpeg sidecar; OpenTimelineIO; ComfyUI HTTP/WebSocket adapter.
