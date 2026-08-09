/**
 * Frontend boundary to the Rust vault services. UI components call these
 * functions — never `invoke` directly (docs/architecture/boundaries.md).
 */
import { invoke } from '@tauri-apps/api/core';

export interface ProjectInfo {
  root: string;
  name: string;
  format_version: number;
}

export const createProject = (root: string, name: string) =>
  invoke<ProjectInfo>('create_project', { root, name });

export const openProject = (root: string) => invoke<ProjectInfo>('open_project', { root });

export const listNotes = (root: string) => invoke<string[]>('list_notes', { root });

export const readNote = (root: string, path: string) => invoke<string>('read_note', { root, path });

export const writeNote = async (root: string, path: string, contents: string): Promise<void> => {
  await invoke('write_note', { root, path, contents });
};
