# Migrations

Discipline per spec section 16. Migrations live in `.project/migrations/`, are
monotonically ordered, transactional where supported, tested forward, tested
against a fresh database and an old-project fixture, and never rewritten after
release - add a new migration instead.

Because SQLite is an index/cache, an irrecoverable index migration must fall
back to rebuilding from authoritative files rather than risking user content.

The index database (`.project/index.sqlite`) tracks its schema version via
SQLite `user_version`, applied transactionally in
`apps/desktop/src-tauri/src/vault/index_db.rs` (`INDEX_VERSION`). Opening an
index newer than the app supports fails loudly with a rebuild instruction
instead of guessing. Because the index is a cache, its recovery path is
delete-and-rebuild from files — verified by test
`rebuild_recovers_from_deleted_index`.
