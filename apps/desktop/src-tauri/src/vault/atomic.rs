use std::fs;
use std::io::Write;
use std::path::Path;

use super::VaultError;

/// Atomic write: temp file in the same directory → flush+sync → rename.
/// A crash mid-write never corrupts the destination (spec §12.3).
pub fn atomic_write(path: &Path, contents: &[u8]) -> Result<(), VaultError> {
    let dir = path
        .parent()
        .ok_or_else(|| VaultError::PathEscape(path.display().to_string()))?;
    fs::create_dir_all(dir)?;
    let file_name = path
        .file_name()
        .ok_or_else(|| VaultError::PathEscape(path.display().to_string()))?
        .to_string_lossy();
    let tmp = dir.join(format!(".{file_name}.tmp-{}", std::process::id()));
    {
        let mut f = fs::File::create(&tmp)?;
        f.write_all(contents)?;
        f.sync_all()?;
    }
    // On Windows, rename fails if the destination exists; replace explicitly.
    match fs::rename(&tmp, path) {
        Ok(()) => Ok(()),
        Err(_) if path.exists() => {
            fs::remove_file(path)?;
            fs::rename(&tmp, path).inspect_err(|_| {
                let _ = fs::remove_file(&tmp);
            })?;
            Ok(())
        }
        Err(e) => {
            let _ = fs::remove_file(&tmp);
            Err(e.into())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_new_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("note.md");
        atomic_write(&path, b"hello").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "hello");
    }

    #[test]
    fn replaces_existing_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("note.md");
        fs::write(&path, "old").unwrap();
        atomic_write(&path, b"new").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "new");
    }

    #[test]
    fn creates_missing_parent_dirs() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a/b/c.md");
        atomic_write(&path, b"x").unwrap();
        assert!(path.exists());
    }

    #[test]
    fn leaves_no_temp_files_behind() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("note.md");
        atomic_write(&path, b"data").unwrap();
        let leftovers: Vec<_> = fs::read_dir(dir.path())
            .unwrap()
            .filter_map(Result::ok)
            .filter(|e| e.file_name().to_string_lossy().contains(".tmp-"))
            .collect();
        assert!(leftovers.is_empty());
    }
}
