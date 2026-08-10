/**
 * Frontend boundary to the Rust vault services. UI components call these
 * functions — never `invoke` directly (docs/architecture/boundaries.md).
 */
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

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
  invoke<ProjectInfo>('create_project', { root, name });

export const openProject = (root: string) => invoke<ProjectInfo>('open_project', { root });

export const listNotes = (root: string) => invoke<string[]>('list_notes', { root });

export const readNote = (root: string, path: string) => invoke<string>('read_note', { root, path });

export const writeNote = async (root: string, path: string, contents: string): Promise<void> => {
  await invoke('write_note', { root, path, contents });
};

export const rebuildIndex = (root: string) => invoke<IndexStats>('rebuild_index', { root });

export const searchNotes = (root: string, query: string) =>
  invoke<SearchHit[]>('search_notes', { root, query });

export const watchProject = async (root: string): Promise<void> => {
  await invoke('watch_project', { root });
};

export const indexHealth = (root: string) => invoke<IndexHealth>('index_health', { root });

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
  invoke<CredentialStatus>('set_provider_key', { provider, key });

export const providerStatus = (provider: string) =>
  invoke<CredentialStatus>('provider_status', { provider });

export const clearProviderKey = (provider: string) =>
  invoke<CredentialStatus>('clear_provider_key', { provider });

export const modelRegistry = () => invoke<ModelCapabilities[]>('model_registry');

export const previewRoute = (model: string, policy: RoutingPolicy) =>
  invoke<RouteDecision>('preview_route', { model, policy });

export const agentComplete = (
  request: {
    model?: string;
    system?: string;
    messages: { role: string; content: string }[];
    max_tokens?: number;
    effort?: string;
  },
  policy: RoutingPolicy,
) => invoke<CompletionResponse>('agent_complete', { request, policy });

export const recentProjects = () => invoke<RecentProject[]>('recent_projects');

export const rememberProject = (root: string, name: string) =>
  invoke<RecentProject[]>('remember_project', { root, name });

export const forgetProject = (root: string) => invoke<RecentProject[]>('forget_project', { root });

export const listAttachments = (root: string) => invoke<Attachment[]>('list_attachments', { root });

export const listCanvases = (root: string) => invoke<string[]>('list_canvases', { root });

export const readCanvas = (root: string, path: string) =>
  invoke<string>('read_canvas', { root, path });

export const writeCanvas = async (root: string, path: string, contents: string): Promise<void> => {
  await invoke('write_canvas', { root, path, contents });
};

/** Subscribe to watcher notifications; payload is the changed note paths. */
export const onVaultChanged = (handler: (paths: string[]) => void): Promise<UnlistenFn> =>
  listen<string[]>('vault-changed', (event) => {
    handler(event.payload);
  });
