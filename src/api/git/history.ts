import { invoke } from '@tauri-apps/api/core';

export interface CommitInfo {
  id: string;
  author: string;
  email: string;
  message: string;
  time: number;
  parents: string[];
}

export interface CommitDetails {
  id: string;
  author: string;
  email: string;
  message: string;
  time: number;
  files: string[];
}

export async function getHistory(
  limit: number,
  filterPath?: string,
  filterContent?: string,
  filterAuthor?: string,
  filterDateFrom?: number,
  filterDateTo?: number,
  skip?: number
): Promise<CommitInfo[]> {
  return await invoke('get_history', {
    limit,
    skip,
    filterPath,
    filterContent,
    filterAuthor,
    filterDateFrom,
    filterDateTo,
  });
}

export async function getCommitDetails(commitId: string): Promise<CommitDetails> {
  return await invoke('get_commit_details', { commitId });
}

export async function getCommitTemplate(): Promise<string | null> {
  return await invoke('get_commit_template');
}

export async function createCommit(message: string, amend: boolean = false): Promise<string> {
  return await invoke('create_commit', { message, amend });
}

export async function cherryPick(commitId: string): Promise<void> {
  await invoke('cherry_pick', { commitId });
}

export async function revertCommit(commitId: string): Promise<void> {
  await invoke('revert_commit', { commitId });
}

export async function getParentCommitId(commitId: string): Promise<string | null> {
  return await invoke('get_parent_commit_id', { commitId });
}

export async function getFileContentAtCommit(commitId: string | null, filePath: string): Promise<string> {
  return await invoke('get_file_content_at_commit', { commitId, filePath });
}
