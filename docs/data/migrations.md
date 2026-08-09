# Migrations

Discipline per spec section 16. Migrations live in `.project/migrations/`, are
monotonically ordered, transactional where supported, tested forward, tested
against a fresh database and an old-project fixture, and never rewritten after
release - add a new migration instead.

Because SQLite is an index/cache, an irrecoverable index migration must fall
back to rebuilding from authoritative files rather than risking user content.

No migrations exist yet; the first arrives with the Phase 1 index.
