use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use super::atomic::atomic_write;
use super::paths::{safe_join, to_relative};
use super::VaultError;

pub const PROJECT_FILE: &str = "project.yaml";
pub const PROJECT_FORMAT_VERSION: u32 = 1;

/// Spec §3 folder layout, created on project init.
const LAYOUT: &[&str] = &[
    "World/Characters",
    "World/Locations",
    "World/Factions",
    "World/Cultures",
    "World/Creatures",
    "World/Technology",
    "World/Items",
    "World/History",
    "World/Rules",
    "World/Themes",
    "World/Research",
    "Story/Sequences",
    "Story/Scenes",
    "Story/Branches",
    "Production/Moments",
    "Production/Shots",
    "Production/ReferenceSets",
    "Production/GenerationPackets",
    "Production/Takes",
    "Production/Reviews",
    "Production/StateSnapshots",
    "Canvases",
    "References/Character",
    "References/Environment",
    "References/Style",
    "References/Costume",
    "References/Props",
    "References/Motion",
    "References/Camera",
    "References/Voice",
    "Media/Images",
    "Media/Video",
    "Media/Audio",
    "Media/Proxies",
    "Media/Thumbnails",
    "Edit/autosaves",
    "Edit/exports",
    ".project/cache",
    ".project/schemas",
    ".project/workflows",
    ".project/workflow-adapters",
    ".project/prompts",
    ".project/migrations",
    ".project/logs",
    ".project/locks",
];

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectFile {
    pub format_version: u32,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct ProjectInfo {
    pub root: String,
    pub name: String,
    pub format_version: u32,
}

pub fn create_project(root: &Path, name: &str) -> Result<ProjectInfo, VaultError> {
    if root.join(PROJECT_FILE).exists() {
        return Err(VaultError::AlreadyExists(root.display().to_string()));
    }
    for dir in LAYOUT {
        fs::create_dir_all(root.join(dir))?;
    }
    let project = ProjectFile {
        format_version: PROJECT_FORMAT_VERSION,
        name: name.to_string(),
    };
    let yaml =
        serde_yaml::to_string(&project).map_err(|e| VaultError::InvalidProject(e.to_string()))?;
    atomic_write(&root.join(PROJECT_FILE), yaml.as_bytes())?;
    atomic_write(
        &root.join("README.md"),
        format!("# {name}\n\nStoryStable project vault.\n").as_bytes(),
    )?;
    open_project(root)
}

pub fn open_project(root: &Path) -> Result<ProjectInfo, VaultError> {
    let file = root.join(PROJECT_FILE);
    if !file.exists() {
        return Err(VaultError::NotAProject(root.display().to_string()));
    }
    let text = fs::read_to_string(&file)?;
    let parsed: ProjectFile =
        serde_yaml::from_str(&text).map_err(|e| VaultError::InvalidProject(e.to_string()))?;
    Ok(ProjectInfo {
        root: root.display().to_string(),
        name: parsed.name,
        format_version: parsed.format_version,
    })
}

/// Text documents the vault owns and may write. Markdown is world/production
/// content; Fountain is the durable screenplay format (spec §6.2).
const TEXT_EXTENSIONS: &[&str] = &["md", "fountain"];

fn is_text_document(name: &str) -> bool {
    let lower = name.to_lowercase();
    TEXT_EXTENSIONS
        .iter()
        .any(|ext| lower.ends_with(&format!(".{ext}")))
}

/// List screenplay files, so STORY can offer them without scanning notes.
pub fn list_screenplays(root: &Path) -> Result<Vec<String>, VaultError> {
    Ok(list_text_documents(root)?
        .into_iter()
        .filter(|p| p.to_lowercase().ends_with(".fountain"))
        .collect())
}

fn list_text_documents(root: &Path) -> Result<Vec<String>, VaultError> {
    let mut found = Vec::new();
    let mut stack: Vec<PathBuf> = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        for entry in fs::read_dir(&dir)? {
            let entry = entry?;
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') {
                continue;
            }
            if path.is_dir() {
                stack.push(path);
            } else if is_text_document(&name) {
                found.push(to_relative(root, &path)?);
            }
        }
    }
    found.sort();
    Ok(found)
}

/// List Markdown notes under the project root, excluding `.project/` and
/// hidden directories. Paths are root-relative with forward slashes, sorted.
pub fn list_notes(root: &Path) -> Result<Vec<String>, VaultError> {
    let mut notes = Vec::new();
    let mut stack: Vec<PathBuf> = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        for entry in fs::read_dir(&dir)? {
            let entry = entry?;
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') {
                continue;
            }
            if path.is_dir() {
                stack.push(path);
            } else if name.to_lowercase().ends_with(".md") {
                notes.push(to_relative(root, &path)?);
            }
        }
    }
    notes.sort();
    Ok(notes)
}

/// Create a folder (and any missing parents) inside the vault.
/// Creating one that already exists is not an error — the desired end state
/// already holds.
pub fn create_folder(root: &Path, relative: &str) -> Result<(), VaultError> {
    if relative.trim().is_empty() {
        return Err(VaultError::PathEscape("empty folder name".into()));
    }
    let path = safe_join(root, relative)?;
    // Refuse to create app-private folders through the content UI.
    if relative.split('/').any(|part| part.starts_with('.')) {
        return Err(VaultError::PathEscape(format!(
            "cannot create hidden folder: {relative}"
        )));
    }
    fs::create_dir_all(path)?;
    Ok(())
}

pub fn read_note(root: &Path, relative: &str) -> Result<String, VaultError> {
    let path = safe_join(root, relative)?;
    Ok(fs::read_to_string(path)?)
}

pub fn write_note(root: &Path, relative: &str, contents: &str) -> Result<(), VaultError> {
    if !is_text_document(relative) {
        return Err(VaultError::PathEscape(format!(
            "only .md and .fountain documents may be written through the vault: {relative}"
        )));
    }
    let path = safe_join(root, relative)?;
    atomic_write(&path, contents.as_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_then_open() {
        let dir = tempfile::tempdir().unwrap();
        let info = create_project(dir.path(), "Test World").unwrap();
        assert_eq!(info.name, "Test World");
        assert!(dir.path().join("World/Characters").is_dir());
        assert!(dir.path().join(".project/migrations").is_dir());
        let reopened = open_project(dir.path()).unwrap();
        assert_eq!(reopened.format_version, PROJECT_FORMAT_VERSION);
    }

    #[test]
    fn create_refuses_existing_project() {
        let dir = tempfile::tempdir().unwrap();
        create_project(dir.path(), "One").unwrap();
        assert!(matches!(
            create_project(dir.path(), "Two"),
            Err(VaultError::AlreadyExists(_))
        ));
    }

    #[test]
    fn open_rejects_non_project() {
        let dir = tempfile::tempdir().unwrap();
        assert!(matches!(
            open_project(dir.path()),
            Err(VaultError::NotAProject(_))
        ));
    }

    #[test]
    fn note_roundtrip_and_listing() {
        let dir = tempfile::tempdir().unwrap();
        create_project(dir.path(), "T").unwrap();
        write_note(
            dir.path(),
            "World/Characters/Lan.md",
            "---\ntitle: Lan\n---\nBody",
        )
        .unwrap();
        let notes = list_notes(dir.path()).unwrap();
        assert!(notes.contains(&"World/Characters/Lan.md".to_string()));
        assert!(notes.contains(&"README.md".to_string()));
        // .project content is never listed
        assert!(notes.iter().all(|n| !n.starts_with(".project")));
        let text = read_note(dir.path(), "World/Characters/Lan.md").unwrap();
        assert!(text.contains("title: Lan"));
    }

    #[test]
    fn creates_nested_folders_idempotently() {
        let dir = tempfile::tempdir().unwrap();
        create_project(dir.path(), "T").unwrap();
        create_folder(dir.path(), "World/Characters/Minor").unwrap();
        assert!(dir.path().join("World/Characters/Minor").is_dir());
        // Second call is a no-op, not an error.
        create_folder(dir.path(), "World/Characters/Minor").unwrap();
    }

    #[test]
    fn create_folder_rejects_escape_hidden_and_empty() {
        let dir = tempfile::tempdir().unwrap();
        create_project(dir.path(), "T").unwrap();
        assert!(create_folder(dir.path(), "../outside").is_err());
        assert!(create_folder(dir.path(), ".project/sneaky").is_err());
        assert!(create_folder(dir.path(), "World/.hidden").is_err());
        assert!(create_folder(dir.path(), "   ").is_err());
    }

    #[test]
    fn write_rejects_escape_and_unknown_extensions() {
        let dir = tempfile::tempdir().unwrap();
        create_project(dir.path(), "T").unwrap();
        assert!(write_note(dir.path(), "../evil.md", "x").is_err());
        assert!(write_note(dir.path(), "World/script.exe", "x").is_err());
    }

    #[test]
    fn screenplays_are_writable_and_listed_separately_from_notes() {
        let dir = tempfile::tempdir().unwrap();
        create_project(dir.path(), "T").unwrap();
        write_note(dir.path(), "Story/master.fountain", "INT. ROOM - DAY").unwrap();
        write_note(dir.path(), "World/Characters/Lan.md", "# Lan").unwrap();

        assert_eq!(
            list_screenplays(dir.path()).unwrap(),
            vec!["Story/master.fountain".to_string()]
        );
        // The notes list stays Markdown-only so the WORLD tree is unchanged.
        let notes = list_notes(dir.path()).unwrap();
        assert!(notes.iter().all(|n| n.ends_with(".md")));
    }
}
