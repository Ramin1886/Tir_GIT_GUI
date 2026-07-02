import { invoke } from '@tauri-apps/api/core';

export interface GitHook {
  name: string;
  content: string;
  exists: boolean;
}

export interface RepoSummary {
  path: string;
  active_branch: string;
  uncommitted_changes_count: number;
  ahead: number;
  behind: number;
}

export async function openRepository(path: string): Promise<void> {
  await invoke('open_repository', { path });
}

export async function runGitCommand(args: string[]): Promise<string> {
  return await invoke('run_git_command', { args });
}

export async function listGitHooks(): Promise<GitHook[]> {
  return await invoke('list_git_hooks');
}

export async function saveGitHook(name: string, content: string): Promise<void> {
  await invoke('save_git_hook', { name, content });
}

export async function deleteGitHook(name: string): Promise<void> {
  await invoke('delete_git_hook', { name });
}

export async function checkMergeConflicts(base: string, head: string): Promise<string[]> {
  return await invoke('check_merge_conflicts', { base, head });
}

export async function cloneRepository(url: string, targetPath: string): Promise<void> {
  await invoke('clone_repository', { url, targetPath });
}

export async function getRepoSummary(path: string): Promise<RepoSummary> {
  return await invoke('get_repo_summary', { path });
}
