import { invoke } from '@tauri-apps/api/core';

export interface BranchInfo {
  name: string;
  shorthand: string;
  is_head: boolean;
  is_remote: boolean;
  upstream?: string;
  ahead?: number;
  behind?: number;
  target_commit?: string;
}

export interface BranchComparisonFile {
  path: string;
  status: string;
}

export interface BranchComparison {
  ahead: number;
  behind: number;
  files: BranchComparisonFile[];
}

export async function listBranches(): Promise<BranchInfo[]> {
  return await invoke('list_branches');
}

export async function compareBranches(branchA: string, branchB: string): Promise<BranchComparison> {
  return await invoke('compare_branches', { branchA, branchB });
}

export async function checkoutBranch(branchName: string, force: boolean = false): Promise<void> {
  await invoke('checkout_branch', { branchName, force });
}

export async function createBranch(branchName: string, startPoint?: string): Promise<void> {
  await invoke('create_branch', { branchName, startPoint: startPoint || null });
}

export async function deleteBranch(branchName: string): Promise<void> {
  await invoke('delete_branch', { branchName });
}

export async function renameBranch(oldName: string, newName: string): Promise<void> {
  await invoke('rename_branch', { oldName, newName });
}

export async function deleteRemoteBranch(remoteName: string, branchName: string): Promise<string> {
  return await invoke('delete_remote_branch', { remoteName, branchName });
}

export async function branchFromStash(index: number, branchName: string): Promise<void> {
  await invoke('branch_from_stash', { index, branchName });
}
