mod vault;

use std::path::PathBuf;

use tauri::Manager;
use vault::index_db::{IndexDb, IndexStats, SearchHit};
use vault::project::{self, ProjectInfo};
use vault::watcher::{self, WatcherState};
use vault::VaultError;

/// App version reported to the frontend.
#[tauri::command]
fn app_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[tauri::command]
fn create_project(root: String, name: String) -> Result<ProjectInfo, VaultError> {
    project::create_project(&PathBuf::from(root), &name)
}

#[tauri::command]
fn open_project(root: String) -> Result<ProjectInfo, VaultError> {
    project::open_project(&PathBuf::from(root))
}

#[tauri::command]
fn list_notes(root: String) -> Result<Vec<String>, VaultError> {
    project::list_notes(&PathBuf::from(root))
}

#[tauri::command]
fn read_note(root: String, path: String) -> Result<String, VaultError> {
    project::read_note(&PathBuf::from(root), &path)
}

#[tauri::command]
fn write_note(root: String, path: String, contents: String) -> Result<(), VaultError> {
    project::write_note(&PathBuf::from(root), &path, &contents)
}

#[tauri::command]
fn rebuild_index(root: String) -> Result<IndexStats, VaultError> {
    let root = PathBuf::from(root);
    IndexDb::open(&root)?.rebuild(&root)
}

#[tauri::command]
fn search_notes(root: String, query: String) -> Result<Vec<SearchHit>, VaultError> {
    IndexDb::open(&PathBuf::from(root))?.search(&query, 50)
}

#[tauri::command]
fn watch_project(app: tauri::AppHandle, root: String) -> Result<(), VaultError> {
    let state = app.state::<WatcherState>();
    watcher::start_watching(app.clone(), &state, PathBuf::from(root))
}

#[derive(serde::Serialize)]
struct IndexHealth {
    notes: u64,
    integrity_ok: bool,
}

#[tauri::command]
fn index_health(root: String) -> Result<IndexHealth, VaultError> {
    let db = IndexDb::open(&PathBuf::from(root))?;
    Ok(IndexHealth {
        notes: db.stats()?.notes,
        integrity_ok: db.integrity_check()?,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(WatcherState::default())
        .invoke_handler(tauri::generate_handler![
            app_version,
            create_project,
            open_project,
            list_notes,
            read_note,
            write_note,
            rebuild_index,
            search_notes,
            watch_project,
            index_health
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    #[test]
    fn version_matches_cargo_metadata() {
        assert_eq!(super::app_version(), env!("CARGO_PKG_VERSION"));
    }
}
