# Troubleshooting

- **`npm run dev` fails on Windows:** confirm WebView2 and MS C++ Build Tools
  are installed (Tauri prerequisites).
- **Rust gates fail but you changed no Rust:** run `cargo clean` and retry;
  check toolchain with `rustc --version` (stable expected).
- **Schema validation fails after editing a schema:** run
  `npm run schema:validate` locally; every schema needs `$schema`, `$id`,
  `title`, `description`, and fixtures must be updated in the same change.

Grows as real issues appear.
