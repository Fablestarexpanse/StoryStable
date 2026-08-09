mod vault;

use std::path::PathBuf;

use vault::project::{self, ProjectInfo};
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            app_version,
            create_project,
            open_project,
            list_notes,
            read_note,
            write_note
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
