//! Non-Markdown vault content: canvases and media attachments.

use std::fs;
use std::path::Path;

use serde::Serialize;

use super::atomic::atomic_write;
use super::paths::{safe_join, to_relative};
use super::VaultError;

#[derive(Debug, Serialize)]
pub struct Attachment {
    pub path: String,
    pub kind: String,
    pub size: u64,
}

/// Classify by extension. `other` covers anything we do not preview.
fn kind_for(ext: &str) -> &'static str {
    match ext {
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "bmp" | "svg" | "avif" => "image",
        "mp4" | "mov" | "webm" | "mkv" | "avi" => "video",
        "mp3" | "wav" | "flac" | "ogg" | "m4a" | "aac" => "audio",
        "pdf" => "document",
        "canvas" => "canvas",
        _ => "other",
    }
}

/// Walk the vault for non-Markdown files, skipping dot-directories
/// (`.project/` included) so index and cache files never surface as content.
pub fn list_attachments(root: &Path) -> Result<Vec<Attachment>, VaultError> {
    let mut out = Vec::new();
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        for entry in fs::read_dir(&dir)? {
            let entry = entry?;
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') {
                continue;
            }
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
                continue;
            }
            let ext = path
                .extension()
                .map(|e| e.to_string_lossy().to_lowercase())
                .unwrap_or_default();
            if ext == "md" {
                continue;
            }
            let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
            out.push(Attachment {
                path: to_relative(root, &path)?,
                kind: kind_for(&ext).to_string(),
                size,
            });
        }
    }
    out.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(out)
}

pub fn list_canvases(root: &Path) -> Result<Vec<String>, VaultError> {
    Ok(list_attachments(root)?
        .into_iter()
        .filter(|a| a.kind == "canvas")
        .map(|a| a.path)
        .collect())
}

pub fn read_canvas(root: &Path, relative: &str) -> Result<String, VaultError> {
    require_canvas(relative)?;
    let path = safe_join(root, relative)?;
    match fs::read_to_string(path) {
        Ok(text) => Ok(text),
        // A canvas that does not exist yet reads as an empty canvas.
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
        Err(e) => Err(e.into()),
    }
}

pub fn write_canvas(root: &Path, relative: &str, contents: &str) -> Result<(), VaultError> {
    require_canvas(relative)?;
    let path = safe_join(root, relative)?;
    atomic_write(&path, contents.as_bytes())
}

fn require_canvas(relative: &str) -> Result<(), VaultError> {
    if relative.to_lowercase().ends_with(".canvas") {
        Ok(())
    } else {
        Err(VaultError::PathEscape(format!(
            "not a canvas file: {relative}"
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::super::project::create_project;
    use super::*;

    #[test]
    fn lists_media_and_skips_markdown_and_dot_dirs() {
        let dir = tempfile::tempdir().unwrap();
        create_project(dir.path(), "T").unwrap();
        fs::write(dir.path().join("Media/Images/board.png"), b"x").unwrap();
        fs::write(dir.path().join("Media/Audio/vo.wav"), b"xx").unwrap();
        fs::write(dir.path().join("World/note.md"), b"# md").unwrap();
        fs::write(dir.path().join(".project/cache/blob.bin"), b"y").unwrap();

        let found = list_attachments(dir.path()).unwrap();
        let paths: Vec<_> = found.iter().map(|a| a.path.as_str()).collect();
        assert!(paths.contains(&"Media/Images/board.png"));
        assert!(paths.contains(&"Media/Audio/vo.wav"));
        assert!(!paths.iter().any(|p| p.ends_with(".md")));
        assert!(!paths.iter().any(|p| p.starts_with(".project")));

        let png = found.iter().find(|a| a.path.ends_with(".png")).unwrap();
        assert_eq!(png.kind, "image");
        assert_eq!(png.size, 1);
        let wav = found.iter().find(|a| a.path.ends_with(".wav")).unwrap();
        assert_eq!(wav.kind, "audio");
    }

    #[test]
    fn canvas_roundtrip_and_listing() {
        let dir = tempfile::tempdir().unwrap();
        create_project(dir.path(), "T").unwrap();
        write_canvas(dir.path(), "Canvases/board.canvas", "{\"nodes\":[]}").unwrap();
        assert_eq!(
            list_canvases(dir.path()).unwrap(),
            vec!["Canvases/board.canvas".to_string()]
        );
        assert_eq!(
            read_canvas(dir.path(), "Canvases/board.canvas").unwrap(),
            "{\"nodes\":[]}"
        );
    }

    #[test]
    fn missing_canvas_reads_as_empty() {
        let dir = tempfile::tempdir().unwrap();
        create_project(dir.path(), "T").unwrap();
        assert_eq!(read_canvas(dir.path(), "Canvases/new.canvas").unwrap(), "");
    }

    #[test]
    fn canvas_io_rejects_wrong_extension_and_escape() {
        let dir = tempfile::tempdir().unwrap();
        create_project(dir.path(), "T").unwrap();
        assert!(write_canvas(dir.path(), "Canvases/x.md", "{}").is_err());
        assert!(write_canvas(dir.path(), "../escape.canvas", "{}").is_err());
        assert!(read_canvas(dir.path(), "../escape.canvas").is_err());
    }
}
