mod agents;
mod vault;

use std::path::PathBuf;

use agents::gateway::{self, ModelCapabilities, RouteDecision, RoutingPolicy};
use agents::secrets::{self, CredentialStatus};
use agents::{anthropic, openrouter, AgentError, CompletionRequest, CompletionResponse};

use tauri::Manager;
use vault::assets::{self, Attachment};
use vault::index_db::{IndexDb, IndexStats, SearchHit};
use vault::project::{self, ProjectInfo};
use vault::recents::{self, RecentProject};
use vault::watcher::{self, WatcherState};
use vault::VaultError;

/// Directory the app stores its own state in — never inside a vault.
fn config_dir(app: &tauri::AppHandle) -> Result<PathBuf, VaultError> {
    app.path()
        .app_config_dir()
        .map_err(|e| VaultError::InvalidProject(format!("no app config dir: {e}")))
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

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
fn create_folder(root: String, path: String) -> Result<(), VaultError> {
    project::create_folder(&PathBuf::from(root), &path)
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

#[tauri::command]
fn recent_projects(app: tauri::AppHandle) -> Result<Vec<RecentProject>, VaultError> {
    Ok(recents::list_recents(&config_dir(&app)?))
}

#[tauri::command]
fn remember_project(
    app: tauri::AppHandle,
    root: String,
    name: String,
) -> Result<Vec<RecentProject>, VaultError> {
    recents::remember(&config_dir(&app)?, &root, &name, now_ms())
}

#[tauri::command]
fn forget_project(app: tauri::AppHandle, root: String) -> Result<Vec<RecentProject>, VaultError> {
    recents::forget(&config_dir(&app)?, &root)
}

#[tauri::command]
fn list_attachments(root: String) -> Result<Vec<Attachment>, VaultError> {
    assets::list_attachments(&PathBuf::from(root))
}

#[tauri::command]
fn list_canvases(root: String) -> Result<Vec<String>, VaultError> {
    assets::list_canvases(&PathBuf::from(root))
}

#[tauri::command]
fn read_canvas(root: String, path: String) -> Result<String, VaultError> {
    assets::read_canvas(&PathBuf::from(root), &path)
}

#[tauri::command]
fn write_canvas(root: String, path: String, contents: String) -> Result<(), VaultError> {
    assets::write_canvas(&PathBuf::from(root), &path, &contents)
}

// --- agents ---------------------------------------------------------------

#[tauri::command]
fn set_provider_key(provider: String, key: String) -> Result<CredentialStatus, AgentError> {
    secrets::set_key(&provider, &key)?;
    Ok(secrets::status(&provider))
}

#[tauri::command]
fn provider_status(provider: String) -> CredentialStatus {
    secrets::status(&provider)
}

#[tauri::command]
fn clear_provider_key(provider: String) -> Result<CredentialStatus, AgentError> {
    secrets::delete_key(&provider)?;
    Ok(secrets::status(&provider))
}

#[tauri::command]
fn model_registry() -> Vec<ModelCapabilities> {
    gateway::registry()
}

/// Resolve a route without calling the provider — used by the context
/// inspector to show the destination before the user commits.
#[tauri::command]
fn preview_route(model: String, policy: RoutingPolicy) -> Result<RouteDecision, AgentError> {
    gateway::route(&model, policy)
}

/// Fetch OpenRouter's live catalogue so any checkpoint the account can reach
/// is selectable, rather than a hard-coded list going stale.
#[tauri::command]
fn openrouter_models() -> Result<Vec<ModelCapabilities>, AgentError> {
    openrouter::list_models()
}

#[tauri::command]
fn agent_complete(
    request: CompletionRequest,
    policy: RoutingPolicy,
) -> Result<CompletionResponse, AgentError> {
    let model = request
        .model
        .clone()
        .unwrap_or_else(|| anthropic::DEFAULT_MODEL.to_string());
    // Policy is enforced before any network call, and the route names the
    // provider that will serve the request.
    let decision = gateway::route(&model, policy)?;
    let mut request = request;
    request.model = Some(model);

    match decision.provider.as_str() {
        openrouter::PROVIDER => openrouter::complete(&request),
        anthropic::PROVIDER => anthropic::complete(&request),
        other => Err(AgentError::UnknownProvider(other.to_string())),
    }
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
            index_health,
            list_attachments,
            list_canvases,
            read_canvas,
            write_canvas,
            recent_projects,
            remember_project,
            forget_project,
            set_provider_key,
            provider_status,
            clear_provider_key,
            model_registry,
            openrouter_models,
            preview_route,
            agent_complete,
            create_folder
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
