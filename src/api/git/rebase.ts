import { invoke } from '@tauri-apps/api/core';

export interface RebaseCommit {
  id: string;
  author: string;
  message: string;
  action: string;
}

export interface RebaseResult {
  success: boolean;
  status: 'completed' | 'conflicts' | 'error';
  message: string;
}

export async function getRebaseCommits(baseCommit: string): Promise<RebaseCommit[]> {
  return await invoke('get_rebase_commits', { baseCommit });
}

export async function performInteractiveRebase(
  baseCommit: string,
  todoList: RebaseCommit[]
): Promise<RebaseResult> {
  return await invoke('perform_interactive_rebase', { baseCommit, todoList });
}

export async function rebaseContinue(): Promise<RebaseResult> {
  return await invoke('rebase_continue');
}

export async function rebaseAbort(): Promise<void> {
  await invoke('rebase_abort');
}
