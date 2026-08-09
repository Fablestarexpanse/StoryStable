# Project Format

The durable project is human-readable Markdown/YAML/JSON plus media, laid out
per spec section 3 (World/, Story/, Production/, Canvases/, References/,
Media/, Edit/, .project/).

Rules:

- User-authored durable content lives outside `.project/`.
- `.project/index.sqlite` is disposable and rebuildable.
- Secrets never live inside the project folder.
- Generated originals are immutable after ingestion; edits create descendants.
- Stored paths are relative to the project root unless explicitly external.
- Stable IDs never depend on filenames; renames must not break identity.
