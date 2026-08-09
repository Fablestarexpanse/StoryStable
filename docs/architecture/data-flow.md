# Data Flow

Authoritative data: project files (Markdown/YAML/JSON + media).
SQLite is an index/cache, rebuildable from files at any time.

Core production flow:

```text
World -> Story -> Scene -> Moment -> Board -> Shot -> References
      -> GenerationPacket -> RenderJob -> Take -> AssemblyClip -> Export
```

Write paths:

- User edits -> VaultService -> atomic file write -> watcher -> IndexService.
- Agent edits -> AgentPatch (hash-guarded) -> review -> apply via VaultService.
- Render output -> ingestion -> AssetService (lineage recorded) -> Takes.

To be expanded with sequence diagrams as Phase 1 lands.
