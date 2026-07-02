import { invoke } from '@tauri-apps/api/core';
import type { DiffLine } from './diff';

export interface FileStatus {
  path: string;
  status: string;
}

export interface WorkingTreeStatus {
  staged: FileStatus[];
  unstaged: FileStatus[];
  untracked: FileStatus[];
  rebase_in_progress: boolean;
}

export async function getStatus(): Promise<WorkingTreeStatus> {
  return await invoke('get_status');
}

export async function stageFile(filePath: string): Promise<void> {
  await invoke('stage_file', { filePath });
}

export async function unstageFile(filePath: string): Promise<void> {
  await invoke('unstage_file', { filePath });
}

export async function discardFileChanges(filePath: string): Promise<void> {
  await invoke('discard_file_changes', { filePath });
}

export async function stageAllFiles(): Promise<void> {
  await invoke('stage_all_files');
}

export async function unstageAllFiles(): Promise<void> {
  await invoke('unstage_all_files');
}

export async function stageHunk(filePath: string, hunkHeader: string, lines: DiffLine[]): Promise<void> {
  await invoke('stage_hunk', { filePath, hunkHeader, lines });
}

export async function unstageHunk(filePath: string, hunkHeader: string, lines: DiffLine[]): Promise<void> {
  await invoke('unstage_hunk', { filePath, hunkHeader, lines });
}

export async function discardHunk(filePath: string, hunkHeader: string, lines: DiffLine[]): Promise<void> {
  await invoke('discard_hunk', { filePath, hunkHeader, lines });
}

export async function applyCustomPatch(patch: string, extraArgs: string[]): Promise<void> {
  await invoke('apply_custom_patch', { patch, extraArgs });
}
