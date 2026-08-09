use std::path::{Component, Path, PathBuf};

use super::VaultError;

/// Join a root-relative path onto the project root, rejecting anything that
/// could escape it: absolute paths, `..` components, drive prefixes.
/// The relative path uses forward slashes on all platforms.
pub fn safe_join(root: &Path, relative: &str) -> Result<PathBuf, VaultError> {
    let rel = Path::new(relative);
    let mut out = root.to_path_buf();
    for component in rel.components() {
        match component {
            Component::Normal(part) => out.push(part),
            Component::CurDir => {}
            _ => return Err(VaultError::PathEscape(relative.to_string())),
        }
    }
    Ok(out)
}

/// Convert an absolute path under `root` back to a forward-slash relative path.
pub fn to_relative(root: &Path, absolute: &Path) -> Result<String, VaultError> {
    let rel = absolute
        .strip_prefix(root)
        .map_err(|_| VaultError::PathEscape(absolute.display().to_string()))?;
    Ok(rel
        .components()
        .map(|c| c.as_os_str().to_string_lossy())
        .collect::<Vec<_>>()
        .join("/"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn joins_normal_paths() {
        let root = Path::new("C:/proj");
        let joined = safe_join(root, "World/Characters/Lan.md").unwrap();
        assert!(joined.ends_with("World/Characters/Lan.md"));
    }

    #[test]
    fn rejects_parent_traversal() {
        let root = Path::new("C:/proj");
        assert!(safe_join(root, "../outside.md").is_err());
        assert!(safe_join(root, "World/../../outside.md").is_err());
    }

    #[test]
    fn rejects_absolute_paths() {
        let root = Path::new("C:/proj");
        assert!(safe_join(root, "/etc/passwd").is_err());
        assert!(safe_join(root, "C:/Windows/system32").is_err());
    }

    #[test]
    fn round_trips_relative() {
        let root = Path::new("C:/proj");
        let abs = safe_join(root, "World/Lan.md").unwrap();
        assert_eq!(to_relative(root, &abs).unwrap(), "World/Lan.md");
    }
}
