import { invoke } from '@tauri-apps/api/core';

export interface SubmoduleInfo {
  name: string;
  path: string;
  url: string;
  status: string;
}

export async function listSubmodules(): Promise<SubmoduleInfo[]> {
  return await invoke('list_submodules');
}

export async function initSubmodules(): Promise<void> {
  await invoke('init_submodules');
}

export async function updateSubmodules(): Promise<void> {
  await invoke('update_submodules');
}

export async function syncSubmodules(): Promise<void> {
  await invoke('sync_submodules');
}

export async function deinitSubmodules(path?: string): Promise<void> {
  await invoke('deinit_submodules', { path: path || null });
}
