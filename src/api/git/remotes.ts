import { invoke } from '@tauri-apps/api/core';

export interface RemoteInfo {
  name: string;
  url: string | null;
  push_url: string | null;
}

export async function listRemotes(): Promise<RemoteInfo[]> {
  return await invoke('list_remotes');
}

export async function addRemote(name: string, url: string): Promise<void> {
  await invoke('add_remote', { name, url });
}

export async function deleteRemote(name: string): Promise<void> {
  await invoke('delete_remote', { name });
}

export async function fetchRemote(name: string): Promise<string> {
  return await invoke('fetch_remote', { name });
}

export async function pushRemote(name: string, branchName: string, force: boolean = false): Promise<string> {
  return await invoke('push_remote', { name, branchName, force });
}

export async function pullRemote(name: string, branchName: string): Promise<string> {
  return await invoke('pull_remote', { name, branchName });
}

export async function setRemoteUrl(name: string, url: string): Promise<void> {
  await invoke('set_remote_url', { name, url });
}
