/**
 * Frontend boundary to the Rust vault services. UI components call these
 * functions — never `invoke` directly (docs/architecture/boundaries.md).
 */
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

/**
 * Whether the app is running inside the Tauri webview, where the Rust
 * commands exist. In a plain browser (the Vite dev server opened directly)
 * there is no IPC bridge, and calling `invoke` throws an opaque
 * "Cannot read properties of undefined (reading 'invoke')".
 */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export const BROWSER_ONLY_MESSAGE =
  'This page is the browser preview, which has no connection to the vault. ' +
  'Run the desktop app (npm run dev) to open projects, edit notes, or use agents.';

/**
 * Every command goes through here so a browser context fails with an
 * explanation instead of a TypeError from deep inside the Tauri client.
 */
async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isDesktop()) throw new Error(BROWSER_ONLY_MESSAGE);
  return invoke<T>(command, args);
}

export interface ProjectInfo {
  root: string;
  name: string;
  format_version: number;
}

export interface SearchHit {
  path: string;
  title: string;
  snippet: string;
}

export interface IndexStats {
  notes: number;
}

export interface IndexHealth {
  notes: number;
  integrity_ok: boolean;
}

export interface Attachment {
  path: string;
  kind: string;
  size: number;
}

export interface RecentProject {
  root: string;
  name: string;
  opened_at: number;
  /** False when the folder no longer contains a project.yaml. */
  exists: boolean;
}

export const createProject = (root: string, name: string) =>
  call<ProjectInfo>('create_project', { root, name });

export const openProject = (root: string) => call<ProjectInfo>('open_project', { root });

export const listNotes = (root: string) => call<string[]>('list_notes', { root });

export const readNote = (root: string, path: string) => call<string>('read_note', { root, path });

export const writeNote = async (root: string, path: string, contents: string): Promise<void> => {
  await call('write_note', { root, path, contents });
};

export const createFolder = async (root: string, path: string): Promise<void> => {
  await call('create_folder', { root, path });
};

export const openrouterModels = () => call<ModelCapabilities[]>('openrouter_models');

export const rebuildIndex = (root: string) => call<IndexStats>('rebuild_index', { root });

export const searchNotes = (root: string, query: string) =>
  call<SearchHit[]>('search_notes', { root, query });

export const watchProject = async (root: string): Promise<void> => {
  await call('watch_project', { root });
};

export const indexHealth = (root: string) => call<IndexHealth>('index_health', { root });

// --- agents ---------------------------------------------------------------

export type RoutingPolicy =
  'local_only' | 'local_first' | 'balanced' | 'best_quality' | 'cloud_allowed';

export interface CredentialStatus {
  provider: string;
  configured: boolean;
  /** Last 4 characters only — never the key itself. */
  hint: string | null;
}

export interface ModelCapabilities {
  provider: string;
  model: string;
  display_name: string;
  privacy_class: 'local' | 'cloud';
  context_tokens: number;
  max_output_tokens: number;
  vision: boolean;
  tool_calling: boolean;
  structured_output: boolean;
  streaming: boolean;
  input_cost_per_mtok: number | null;
  output_cost_per_mtok: number | null;
}

export interface RouteDecision {
  provider: string;
  model: string;
  privacy_class: 'local' | 'cloud';
  policy: string;
  rationale: string;
}

export interface CompletionResponse {
  text: string;
  model: string;
  stop_reason: string | null;
  input_tokens: number;
  output_tokens: number;
}

export const setProviderKey = (provider: string, key: string) =>
  call<CredentialStatus>('set_provider_key', { provider, key });

export const providerStatus = (provider: string) =>
  call<CredentialStatus>('provider_status', { provider });

export const clearProviderKey = (provider: string) =>
  call<CredentialStatus>('clear_provider_key', { provider });

export const modelRegistry = () => call<ModelCapabilities[]>('model_registry');

export const previewRoute = (model: string, policy: RoutingPolicy) =>
  call<RouteDecision>('preview_route', { model, policy });

export const agentComplete = (
  request: {
    model?: string;
    system?: string;
    messages: { role: string; content: string }[];
    max_tokens?: number;
    effort?: string;
  },
  policy: RoutingPolicy,
) => call<CompletionResponse>('agent_complete', { request, policy });

export const recentProjects = () => call<RecentProject[]>('recent_projects');

export const rememberProject = (root: string, name: string) =>
  call<RecentProject[]>('remember_project', { root, name });

export const forgetProject = (root: string) => call<RecentProject[]>('forget_project', { root });

export const listAttachments = (root: string) => call<Attachment[]>('list_attachments', { root });

export const listCanvases = (root: string) => call<string[]>('list_canvases', { root });

export const readCanvas = (root: string, path: string) =>
  call<string>('read_canvas', { root, path });

export const writeCanvas = async (root: string, path: string, contents: string): Promise<void> => {
  await call('write_canvas', { root, path, contents });
};

/** Subscribe to watcher notifications; payload is the changed note paths. */
export const onVaultChanged = async (handler: (paths: string[]) => void): Promise<UnlistenFn> => {
  // No watcher exists outside the desktop app; hand back a no-op unsubscribe
  // so callers can clean up unconditionally.
  if (!isDesktop()) return () => undefined;
  return listen<string[]>('vault-changed', (event) => {
    handler(event.payload);
  });
};
