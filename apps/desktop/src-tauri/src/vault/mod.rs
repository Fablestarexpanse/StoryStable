//! Vault services: project layout, path safety, atomic file IO.
//!
//! Rules enforced here (spec §3, §12.3):
//! - every path from the frontend is validated against the project root
//! - writes are atomic (temp file → flush → rename)
//! - user-authored durable content lives outside `.project/`

pub mod assets;
pub mod atomic;
pub mod index_db;
pub mod paths;
pub mod project;
pub mod recents;
pub mod watcher;

use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum VaultError {
    #[error("path escapes the project root: {0}")]
    PathEscape(String),
    #[error("not a project root (missing project.yaml): {0}")]
    NotAProject(String),
    #[error("project already exists at {0}")]
    AlreadyExists(String),
    #[error("invalid project file: {0}")]
    InvalidProject(String),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("index error: {0}")]
    Sqlite(#[from] rusqlite::Error),
}

/// Serialized to the frontend as a plain message string.
impl Serialize for VaultError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
