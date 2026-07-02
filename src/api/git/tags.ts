import { invoke } from '@tauri-apps/api/core';

export interface TagInfo {
  name: string;
  shorthand: string;
  id: string;
  message: string | null;
}

export async function listTags(): Promise<TagInfo[]> {
  return await invoke('list_tags');
}

export async function createTag(name: string, targetCommit: string, message?: string): Promise<void> {
  await invoke('create_tag', { name, targetCommit, message: message || null });
}

export async function deleteTag(name: string): Promise<void> {
  await invoke('delete_tag', { name });
}

export async function pushTag(remoteName: string, tagName: string): Promise<string> {
  return await invoke('push_tag', { remoteName, tagName });
}
