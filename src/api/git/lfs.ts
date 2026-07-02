import { invoke } from '@tauri-apps/api/core';

export interface LfsLockInfo {
  id: string;
  path: string;
  owner: { name: string } | null;
  locked_at: string;
}

export async function trackLfsPatterns(patterns: string[]): Promise<void> {
  await invoke('lfs_track_patterns', { patterns });
}

export async function listTrackedLfsPatterns(): Promise<string[]> {
  return await invoke('lfs_list_tracked_patterns');
}

export async function listLfsLocks(): Promise<LfsLockInfo[]> {
  return await invoke('lfs_list_locks');
}

export async function pushLfs(remote: string, branch: string): Promise<string> {
  return await invoke('lfs_push', { remote, branch });
}
