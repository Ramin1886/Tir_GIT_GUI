import { invoke } from '@tauri-apps/api/core';

export interface BlameLine {
  line_number: number;
  commit_id: string;
  author: string;
  summary: string;
  time: number;
  content: string;
}

export async function getBlame(filePath: string, commitId?: string): Promise<BlameLine[]> {
  return await invoke('get_blame', { filePath, commitId: commitId || null });
}
