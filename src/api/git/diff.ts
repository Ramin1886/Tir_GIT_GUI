import { invoke } from '@tauri-apps/api/core';

export interface DiffLine {
  content: string;
  origin: string;
  old_lineno: number | null;
  new_lineno: number | null;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface FileDiff {
  hunks: DiffHunk[];
}

export async function getDiff(
  path: string,
  commitId?: string,
  staged: boolean = false
): Promise<FileDiff> {
  return await invoke('get_diff', { path, commitId: commitId || null, staged });
}
