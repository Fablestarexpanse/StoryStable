//! SQLite index for the vault. The index is a disposable cache: it can
//! always be rebuilt from project files (spec §11), and an irrecoverable
//! index never risks user content.

use std::fs;
use std::path::Path;

use rusqlite::Connection;
use serde::Serialize;

use super::project::list_notes;
use super::VaultError;

/// Bumped only through an explicit migration added to `migrate()`.
pub const INDEX_VERSION: i32 = 1;

const SCHEMA_V1: &str = "
CREATE TABLE notes (
  path     TEXT PRIMARY KEY,
  title    TEXT NOT NULL,
  mtime_ms INTEGER NOT NULL,
  size     INTEGER NOT NULL
) STRICT;
CREATE VIRTUAL TABLE notes_fts USING fts5(path UNINDEXED, title, body, tokenize='unicode61');
";

#[derive(Debug, Serialize)]
pub struct IndexStats {
    pub notes: u64,
}

#[derive(Debug, Serialize)]
pub struct SearchHit {
    pub path: String,
    pub title: String,
    pub snippet: String,
}

pub struct IndexDb {
    conn: Connection,
}

impl IndexDb {
    /// Open (creating/migrating as needed) the project's index database.
    pub fn open(root: &Path) -> Result<Self, VaultError> {
        let dir = root.join(".project");
        fs::create_dir_all(&dir)?;
        let conn = Connection::open(dir.join("index.sqlite"))?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        let mut db = Self { conn };
        db.migrate()?;
        Ok(db)
    }

    fn user_version(&self) -> Result<i32, VaultError> {
        Ok(self
            .conn
            .query_row("PRAGMA user_version", [], |r| r.get(0))?)
    }

    fn migrate(&mut self) -> Result<(), VaultError> {
        let version = self.user_version()?;
        if version > INDEX_VERSION {
            return Err(VaultError::InvalidProject(format!(
                "index version {version} is newer than this app supports ({INDEX_VERSION}); \
                 delete .project/index.sqlite to rebuild"
            )));
        }
        if version < 1 {
            let tx = self.conn.transaction()?;
            tx.execute_batch(SCHEMA_V1)?;
            tx.pragma_update(None, "user_version", 1)?;
            tx.commit()?;
        }
        Ok(())
    }

    /// Drop all rows and re-index every note from the files on disk.
    pub fn rebuild(&mut self, root: &Path) -> Result<IndexStats, VaultError> {
        let paths = list_notes(root)?;
        let tx = self.conn.transaction()?;
        tx.execute("DELETE FROM notes", [])?;
        tx.execute("DELETE FROM notes_fts", [])?;
        let mut count = 0u64;
        for rel in &paths {
            if Self::upsert_in_tx(&tx, root, rel)? {
                count += 1;
            }
        }
        tx.commit()?;
        Ok(IndexStats { notes: count })
    }

    /// Insert or refresh a single note. Returns false if the file vanished.
    pub fn upsert_note(&mut self, root: &Path, rel: &str) -> Result<bool, VaultError> {
        let tx = self.conn.transaction()?;
        tx.execute("DELETE FROM notes WHERE path = ?1", [rel])?;
        tx.execute("DELETE FROM notes_fts WHERE path = ?1", [rel])?;
        let present = Self::upsert_in_tx(&tx, root, rel)?;
        tx.commit()?;
        Ok(present)
    }

    pub fn remove_note(&mut self, rel: &str) -> Result<(), VaultError> {
        let tx = self.conn.transaction()?;
        tx.execute("DELETE FROM notes WHERE path = ?1", [rel])?;
        tx.execute("DELETE FROM notes_fts WHERE path = ?1", [rel])?;
        tx.commit()?;
        Ok(())
    }

    fn upsert_in_tx(
        tx: &rusqlite::Transaction<'_>,
        root: &Path,
        rel: &str,
    ) -> Result<bool, VaultError> {
        let abs = super::paths::safe_join(root, rel)?;
        let Ok(meta) = fs::metadata(&abs) else {
            return Ok(false);
        };
        let Ok(source) = fs::read_to_string(&abs) else {
            return Ok(false);
        };
        let (title, body) = title_and_body(rel, &source);
        let mtime_ms = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);
        tx.execute(
            "INSERT INTO notes(path, title, mtime_ms, size) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![rel, title, mtime_ms, meta.len() as i64],
        )?;
        tx.execute(
            "INSERT INTO notes_fts(path, title, body) VALUES (?1, ?2, ?3)",
            rusqlite::params![rel, title, body],
        )?;
        Ok(true)
    }

    /// Full-text search over titles and bodies. User input is quoted per
    /// token so FTS5 operator syntax can never break the query.
    pub fn search(&self, query: &str, limit: u32) -> Result<Vec<SearchHit>, VaultError> {
        let sanitized: Vec<String> = query
            .split_whitespace()
            .map(|t| format!("\"{}\"*", t.replace('"', "")))
            .collect();
        if sanitized.is_empty() {
            return Ok(Vec::new());
        }
        let fts_query = sanitized.join(" ");
        let mut stmt = self.conn.prepare(
            "SELECT path, title, snippet(notes_fts, 2, '[', ']', ' … ', 12)
             FROM notes_fts WHERE notes_fts MATCH ?1
             ORDER BY bm25(notes_fts) LIMIT ?2",
        )?;
        let rows = stmt.query_map(rusqlite::params![fts_query, limit], |r| {
            Ok(SearchHit {
                path: r.get(0)?,
                title: r.get(1)?,
                snippet: r.get(2)?,
            })
        })?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn stats(&self) -> Result<IndexStats, VaultError> {
        let notes: u64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM notes", [], |r| r.get(0))?;
        Ok(IndexStats { notes })
    }

    /// `PRAGMA integrity_check` for Project Health.
    pub fn integrity_check(&self) -> Result<bool, VaultError> {
        let result: String = self
            .conn
            .query_row("PRAGMA integrity_check", [], |r| r.get(0))?;
        Ok(result == "ok")
    }
}

/// Minimal title extraction: `title:` from a leading frontmatter block,
/// falling back to the filename stem. Body is the text after the block.
/// The TS domain layer owns rich parsing; the index only needs search text.
fn title_and_body<'a>(rel: &str, source: &'a str) -> (String, &'a str) {
    let stem = rel
        .rsplit('/')
        .next()
        .unwrap_or(rel)
        .trim_end_matches(".md")
        .trim_end_matches(".MD");
    if let Some(rest) = source.strip_prefix("---") {
        if let Some((fm, body)) = rest.split_once("\n---") {
            let title = serde_yaml::from_str::<serde_yaml::Value>(fm)
                .ok()
                .and_then(|v| v.get("title").and_then(|t| t.as_str().map(String::from)))
                .unwrap_or_else(|| stem.to_string());
            let body = body.split_once('\n').map(|(_, b)| b).unwrap_or("");
            return (title, body);
        }
    }
    (stem.to_string(), source)
}

#[cfg(test)]
mod tests {
    use super::super::project::{create_project, write_note};
    use super::*;

    fn setup() -> (tempfile::TempDir, IndexDb) {
        let dir = tempfile::tempdir().unwrap();
        create_project(dir.path(), "T").unwrap();
        let db = IndexDb::open(dir.path()).unwrap();
        (dir, db)
    }

    #[test]
    fn migrates_to_current_version() {
        let (_dir, db) = setup();
        assert_eq!(db.user_version().unwrap(), INDEX_VERSION);
        assert!(db.integrity_check().unwrap());
    }

    #[test]
    fn rebuild_indexes_all_notes() {
        let (dir, mut db) = setup();
        write_note(
            dir.path(),
            "World/Characters/Lan.md",
            "---\ntitle: Lan\n---\nThe pilot watches the debris field.",
        )
        .unwrap();
        let stats = db.rebuild(dir.path()).unwrap();
        assert_eq!(stats.notes, 2); // README.md + Lan.md
        let hits = db.search("debris", 10).unwrap();
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].path, "World/Characters/Lan.md");
        assert_eq!(hits[0].title, "Lan");
        assert!(hits[0].snippet.contains("[debris]"));
    }

    #[test]
    fn search_matches_titles_and_prefixes() {
        let (dir, mut db) = setup();
        write_note(dir.path(), "World/Locations/Outer Ring.md", "# Ring\n").unwrap();
        db.rebuild(dir.path()).unwrap();
        // filename-derived title, prefix match
        let hits = db.search("Oute", 10).unwrap();
        assert_eq!(hits.len(), 1);
    }

    #[test]
    fn fts_operator_injection_is_inert() {
        let (dir, mut db) = setup();
        db.rebuild(dir.path()).unwrap();
        // would be a syntax error if passed through raw
        assert!(db.search("NEAR( AND \"", 10).is_ok());
        assert!(db.search("col:evil", 10).is_ok());
    }

    #[test]
    fn incremental_upsert_and_remove() {
        let (dir, mut db) = setup();
        db.rebuild(dir.path()).unwrap();
        write_note(dir.path(), "World/New.md", "fresh content here").unwrap();
        assert!(db.upsert_note(dir.path(), "World/New.md").unwrap());
        assert_eq!(db.search("fresh", 10).unwrap().len(), 1);

        db.remove_note("World/New.md").unwrap();
        assert_eq!(db.search("fresh", 10).unwrap().len(), 0);
        // upsert of a vanished file reports absence
        assert!(!db.upsert_note(dir.path(), "World/Gone.md").unwrap());
    }

    #[test]
    fn rebuild_recovers_from_deleted_index() {
        let (dir, mut db) = setup();
        write_note(dir.path(), "World/A.md", "alpha").unwrap();
        db.rebuild(dir.path()).unwrap();
        drop(db);
        std::fs::remove_file(dir.path().join(".project/index.sqlite")).unwrap();
        let mut db = IndexDb::open(dir.path()).unwrap();
        let stats = db.rebuild(dir.path()).unwrap();
        assert_eq!(stats.notes, 2);
    }

    #[test]
    fn future_index_version_fails_loudly() {
        let (dir, db) = setup();
        db.conn.pragma_update(None, "user_version", 99).unwrap();
        drop(db);
        assert!(matches!(
            IndexDb::open(dir.path()),
            Err(VaultError::InvalidProject(_))
        ));
    }
}
