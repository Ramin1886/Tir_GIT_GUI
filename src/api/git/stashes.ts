import { invoke } from '@tauri-apps/api/core';

export interface StashInfo {
  index: number;
  message: string;
  id: string;
}

export async function listStashes(): Promise<StashInfo[]> {
  return await invoke('list_stashes');
}

export async function saveStash(message?: string, includeUntracked: boolean = false): Promise<void> {
  await invoke('save_stash', { message: message || null, includeUntracked });
}

export async function applyStash(index: number): Promise<void> {
  await invoke('apply_stash', { index });
}

export async function popStash(index: number): Promise<void> {
  await invoke('pop_stash', { index });
}

export async function dropStash(index: number): Promise<void> {
  await invoke('drop_stash', { index });
}
