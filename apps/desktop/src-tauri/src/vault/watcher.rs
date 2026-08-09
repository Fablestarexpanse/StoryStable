//! Recursive file watcher: keeps the SQLite index fresh and notifies the
//! frontend with a `vault-changed` event carrying the affected note paths.

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::Emitter;

use super::index_db::IndexDb;
use super::paths::to_relative;
use super::VaultError;

/// Held in Tauri managed state; dropping the previous watcher stops it.
#[derive(Default)]
pub struct WatcherState(pub Mutex<Option<RecommendedWatcher>>);

pub const VAULT_CHANGED_EVENT: &str = "vault-changed";

pub fn start_watching(
    app: tauri::AppHandle,
    state: &WatcherState,
    root: PathBuf,
) -> Result<(), VaultError> {
    let watch_root = root.clone();
    let mut watcher = notify::recommended_watcher(move |result: Result<Event, notify::Error>| {
        let Ok(event) = result else { return };
        let changed = relevant_note_paths(&root, &event);
        if changed.is_empty() {
            return;
        }
        // Update the index incrementally; a failure here is logged, never fatal —
        // the index is a rebuildable cache.
        match IndexDb::open(&root) {
            Ok(mut db) => {
                for rel in &changed {
                    let result = if matches!(event.kind, notify::EventKind::Remove(_)) {
                        db.remove_note(rel)
                    } else {
                        // upsert also clears rows when the file vanished mid-event
                        db.upsert_note(&root, rel).map(|_| ())
                    };
                    if let Err(e) = result {
                        eprintln!("index update failed for {rel}: {e}");
                    }
                }
            }
            Err(e) => eprintln!("index open failed: {e}"),
        }
        let _ = app.emit(VAULT_CHANGED_EVENT, changed);
    })
    .map_err(|e| VaultError::InvalidProject(format!("watcher: {e}")))?;

    watcher
        .watch(&watch_root, RecursiveMode::Recursive)
        .map_err(|e| VaultError::InvalidProject(format!("watch: {e}")))?;

    // Replace any previous watcher (stops it by drop).
    let mut guard = state.0.lock().expect("watcher state poisoned");
    *guard = Some(watcher);
    Ok(())
}

/// Filter an fs event down to root-relative `.md` paths outside dot-dirs.
fn relevant_note_paths(root: &Path, event: &Event) -> Vec<String> {
    event
        .paths
        .iter()
        .filter_map(|p| to_relative(root, p).ok())
        .filter(|rel| {
            rel.to_lowercase().ends_with(".md") && !rel.split('/').any(|part| part.starts_with('.'))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use notify::event::{CreateKind, EventKind};

    #[test]
    fn filters_markdown_outside_dot_dirs() {
        let root = Path::new("C:/proj");
        let event = Event {
            kind: EventKind::Create(CreateKind::File),
            paths: vec![
                PathBuf::from("C:/proj/World/Lan.md"),
                PathBuf::from("C:/proj/.project/index.sqlite"),
                PathBuf::from("C:/proj/Media/clip.mp4"),
                PathBuf::from("C:/elsewhere/outside.md"),
            ],
            attrs: Default::default(),
        };
        assert_eq!(relevant_note_paths(root, &event), vec!["World/Lan.md"]);
    }
}
