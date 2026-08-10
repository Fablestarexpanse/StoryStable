//! Hash-guarded writes for agent-proposed edits.
//!
//! Spec §5.12: "A patch must fail safely if the target hash has changed since
//! the proposal was created; require regeneration/rebase rather than blindly
//! applying stale edits."
//!
//! The window between an agent reading a note and the user approving its
//! proposal can be minutes long, and the file may have changed in that time —
//! edited in this app, in another editor, or by the file watcher's source.
//! Applying regardless would silently destroy the newer version, so the hash
//! recorded at proposal time is re-checked immediately before writing.

use std::fs;
use std::path::Path;

use sha2::{Digest, Sha256};

use super::atomic::atomic_write;
use super::paths::safe_join;
use super::VaultError;

/// Content hash in the `sha256:<hex>` form the schemas use.
pub fn hash_content(contents: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(contents.as_bytes());
    format!("sha256:{:x}", hasher.finalize())
}

/// Hash of a note as it currently stands on disk.
///
/// A note that does not exist hashes as empty content, so a patch that
/// *creates* a file can record the same value and still be guarded: if
/// someone else creates the file first, the hashes diverge and the apply is
/// refused rather than clobbering their work.
pub fn note_hash(root: &Path, relative: &str) -> Result<String, VaultError> {
    let path = safe_join(root, relative)?;
    let contents = match fs::read_to_string(&path) {
        Ok(text) => text,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => String::new(),
        Err(e) => return Err(e.into()),
    };
    Ok(hash_content(&contents))
}

/// Apply a proposed edit, but only if the file still matches what the
/// proposal was based on.
pub fn apply_patch(
    root: &Path,
    relative: &str,
    expected_hash: &str,
    contents: &str,
) -> Result<String, VaultError> {
    if !relative.to_lowercase().ends_with(".md") {
        return Err(VaultError::PathEscape(format!(
            "only .md notes may be patched: {relative}"
        )));
    }
    let current = note_hash(root, relative)?;
    if current != expected_hash {
        return Err(VaultError::StalePatch {
            path: relative.to_string(),
            expected: expected_hash.to_string(),
            actual: current,
        });
    }
    let path = safe_join(root, relative)?;
    atomic_write(&path, contents.as_bytes())?;
    Ok(hash_content(contents))
}

#[cfg(test)]
mod tests {
    use super::super::project::{create_project, write_note};
    use super::*;

    fn vault() -> tempfile::TempDir {
        let dir = tempfile::tempdir().unwrap();
        create_project(dir.path(), "T").unwrap();
        dir
    }

    #[test]
    fn hash_is_stable_and_content_sensitive() {
        assert_eq!(hash_content("abc"), hash_content("abc"));
        assert_ne!(hash_content("abc"), hash_content("abd"));
        assert!(hash_content("abc").starts_with("sha256:"));
    }

    #[test]
    fn missing_file_hashes_as_empty_content() {
        let dir = vault();
        assert_eq!(
            note_hash(dir.path(), "World/Nope.md").unwrap(),
            hash_content("")
        );
    }

    #[test]
    fn applies_when_the_file_is_unchanged() {
        let dir = vault();
        write_note(dir.path(), "World/A.md", "original").unwrap();
        let before = note_hash(dir.path(), "World/A.md").unwrap();

        let after = apply_patch(dir.path(), "World/A.md", &before, "revised").unwrap();
        assert_eq!(
            std::fs::read_to_string(dir.path().join("World/A.md")).unwrap(),
            "revised"
        );
        assert_eq!(after, hash_content("revised"));
    }

    #[test]
    fn refuses_when_the_file_changed_under_the_proposal() {
        let dir = vault();
        write_note(dir.path(), "World/A.md", "original").unwrap();
        let stale = note_hash(dir.path(), "World/A.md").unwrap();

        // Someone edits the note after the agent read it.
        write_note(dir.path(), "World/A.md", "edited by the user").unwrap();

        let err = apply_patch(dir.path(), "World/A.md", &stale, "agent version").unwrap_err();
        assert!(matches!(err, VaultError::StalePatch { .. }));
        // The user's edit survives untouched.
        assert_eq!(
            std::fs::read_to_string(dir.path().join("World/A.md")).unwrap(),
            "edited by the user"
        );
    }

    #[test]
    fn can_create_a_new_note_but_not_overwrite_a_race() {
        let dir = vault();
        let empty = hash_content("");
        apply_patch(dir.path(), "World/New.md", &empty, "created").unwrap();
        assert_eq!(
            std::fs::read_to_string(dir.path().join("World/New.md")).unwrap(),
            "created"
        );

        // A second create against the same empty-hash expectation must fail.
        assert!(matches!(
            apply_patch(dir.path(), "World/New.md", &empty, "other"),
            Err(VaultError::StalePatch { .. })
        ));
    }

    #[test]
    fn rejects_escape_and_non_markdown_targets() {
        let dir = vault();
        let empty = hash_content("");
        assert!(apply_patch(dir.path(), "../evil.md", &empty, "x").is_err());
        assert!(apply_patch(dir.path(), "World/x.exe", &empty, "x").is_err());
    }

    #[test]
    fn reapplying_the_same_patch_is_refused_not_silently_repeated() {
        let dir = vault();
        write_note(dir.path(), "World/A.md", "v1").unwrap();
        let h1 = note_hash(dir.path(), "World/A.md").unwrap();
        apply_patch(dir.path(), "World/A.md", &h1, "v2").unwrap();
        // The proposal is now spent; applying it again would be a no-op at
        // best and a revert at worst.
        assert!(matches!(
            apply_patch(dir.path(), "World/A.md", &h1, "v2"),
            Err(VaultError::StalePatch { .. })
        ));
    }
}
