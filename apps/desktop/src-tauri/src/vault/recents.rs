//! Recently-opened projects.
//!
//! Stored in the OS app-config directory, never inside a project vault —
//! the vault stays portable and contains only the user's own content
//! (spec §3: user-authored durable content, no app state).

use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use super::atomic::atomic_write;
use super::project::PROJECT_FILE;
use super::VaultError;

pub const RECENTS_FILE: &str = "recent-projects.json";
const MAX_RECENTS: usize = 12;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentProject {
    pub root: String,
    pub name: String,
    /// Milliseconds since the Unix epoch, supplied by the caller.
    pub opened_at: i64,
    /// Whether the project still exists on disk. Not persisted — it is
    /// recomputed on every read so a moved vault shows as missing.
    #[serde(skip_deserializing, default)]
    pub exists: bool,
}

fn recents_path(config_dir: &Path) -> PathBuf {
    config_dir.join(RECENTS_FILE)
}

/// Read the list, newest first, annotating whether each project still exists.
/// A corrupt or missing file yields an empty list rather than an error —
/// losing the recents list must never block opening a project.
pub fn list_recents(config_dir: &Path) -> Vec<RecentProject> {
    let Ok(text) = fs::read_to_string(recents_path(config_dir)) else {
        return Vec::new();
    };
    let Ok(mut entries) = serde_json::from_str::<Vec<RecentProject>>(&text) else {
        return Vec::new();
    };
    for entry in &mut entries {
        entry.exists = Path::new(&entry.root).join(PROJECT_FILE).is_file();
    }
    entries.sort_by(|a, b| b.opened_at.cmp(&a.opened_at));
    entries
}

/// Record a project as most-recently opened. Existing entries for the same
/// root are replaced, so the list never accumulates duplicates.
pub fn remember(
    config_dir: &Path,
    root: &str,
    name: &str,
    opened_at: i64,
) -> Result<Vec<RecentProject>, VaultError> {
    let mut entries = list_recents(config_dir);
    entries.retain(|e| !same_root(&e.root, root));
    entries.insert(
        0,
        RecentProject {
            root: root.to_string(),
            name: name.to_string(),
            opened_at,
            exists: true,
        },
    );
    entries.truncate(MAX_RECENTS);
    save(config_dir, &entries)?;
    Ok(entries)
}

pub fn forget(config_dir: &Path, root: &str) -> Result<Vec<RecentProject>, VaultError> {
    let mut entries = list_recents(config_dir);
    entries.retain(|e| !same_root(&e.root, root));
    save(config_dir, &entries)?;
    Ok(entries)
}

fn save(config_dir: &Path, entries: &[RecentProject]) -> Result<(), VaultError> {
    fs::create_dir_all(config_dir)?;
    let json = serde_json::to_string_pretty(entries)
        .map_err(|e| VaultError::InvalidProject(e.to_string()))?;
    atomic_write(&recents_path(config_dir), json.as_bytes())
}

/// Windows paths are case-insensitive and may mix separators; compare
/// leniently so the same vault never appears twice.
fn same_root(a: &str, b: &str) -> bool {
    let norm = |s: &str| {
        s.replace('\\', "/")
            .trim_end_matches('/')
            .to_lowercase()
            .to_string()
    };
    norm(a) == norm(b)
}

#[cfg(test)]
mod tests {
    use super::super::project::create_project;
    use super::*;

    #[test]
    fn missing_file_yields_empty_list() {
        let dir = tempfile::tempdir().unwrap();
        assert!(list_recents(dir.path()).is_empty());
    }

    #[test]
    fn corrupt_file_yields_empty_list_instead_of_erroring() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(recents_path(dir.path()), "{ not json").unwrap();
        assert!(list_recents(dir.path()).is_empty());
    }

    #[test]
    fn remembers_newest_first_without_duplicates() {
        let cfg = tempfile::tempdir().unwrap();
        remember(cfg.path(), "F:/a", "A", 100).unwrap();
        remember(cfg.path(), "F:/b", "B", 200).unwrap();
        remember(cfg.path(), "F:/a", "A renamed", 300).unwrap();

        let entries = list_recents(cfg.path());
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].root, "F:/a");
        assert_eq!(entries[0].name, "A renamed");
        assert_eq!(entries[1].root, "F:/b");
    }

    #[test]
    fn treats_windows_path_variants_as_the_same_project() {
        let cfg = tempfile::tempdir().unwrap();
        remember(cfg.path(), "F:/Test Projects/V", "V", 1).unwrap();
        remember(cfg.path(), "F:\\Test Projects\\v\\", "V", 2).unwrap();
        assert_eq!(list_recents(cfg.path()).len(), 1);
    }

    #[test]
    fn caps_the_list() {
        let cfg = tempfile::tempdir().unwrap();
        for i in 0..(MAX_RECENTS + 5) {
            remember(cfg.path(), &format!("F:/p{i}"), "P", i as i64).unwrap();
        }
        assert_eq!(list_recents(cfg.path()).len(), MAX_RECENTS);
    }

    #[test]
    fn reports_whether_the_project_still_exists() {
        let cfg = tempfile::tempdir().unwrap();
        let real = tempfile::tempdir().unwrap();
        create_project(real.path(), "Real").unwrap();

        remember(cfg.path(), &real.path().display().to_string(), "Real", 2).unwrap();
        remember(cfg.path(), "F:/definitely/not/here", "Gone", 1).unwrap();

        let entries = list_recents(cfg.path());
        assert!(entries[0].exists);
        assert!(!entries[1].exists);
    }

    #[test]
    fn forget_removes_an_entry() {
        let cfg = tempfile::tempdir().unwrap();
        remember(cfg.path(), "F:/a", "A", 1).unwrap();
        remember(cfg.path(), "F:/b", "B", 2).unwrap();
        forget(cfg.path(), "F:/a").unwrap();
        let entries = list_recents(cfg.path());
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].root, "F:/b");
    }

    #[test]
    fn recents_never_live_inside_the_vault() {
        let cfg = tempfile::tempdir().unwrap();
        let vault = tempfile::tempdir().unwrap();
        create_project(vault.path(), "V").unwrap();
        remember(cfg.path(), &vault.path().display().to_string(), "V", 1).unwrap();
        assert!(!vault.path().join(RECENTS_FILE).exists());
        assert!(!vault.path().join(".project").join(RECENTS_FILE).exists());
    }
}
