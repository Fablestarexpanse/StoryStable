# Testing

Strategy per spec section 17. Current gates:

| Gate              | Command                                                    |
| ----------------- | ---------------------------------------------------------- |
| Format            | `npm run format:check`                                     |
| Lint              | `npm run lint`                                             |
| Typecheck         | `npm run typecheck`                                        |
| Unit tests        | `npm test`                                                 |
| Schema validation | `npm run schema:validate`                                  |
| All of the above  | `npm run verify`                                           |
| Rust format       | `cargo fmt --all -- --check`                               |
| Rust lint         | `cargo clippy --all-targets --all-features -- -D warnings` |
| Rust tests        | `cargo test --all`                                         |
| Frontend build    | `npm run build`                                            |

Planned as phases land: integration tests (index rebuild, patch lifecycle,
ComfyUI mock), E2E smoke (create project through export), and golden tests
(H3 prompts, adapter JSON, OTIO, frontmatter serialization). Snapshot changes
require explicit review - never blanket acceptance.
