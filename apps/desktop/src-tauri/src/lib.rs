/// App version reported to the frontend. Placeholder command proving the
/// IPC boundary; real services arrive with Phase 1.
#[tauri::command]
fn app_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_version])
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
