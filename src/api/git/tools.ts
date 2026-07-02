import { invoke } from '@tauri-apps/api/core';

export interface ToolCommands {
  diff: string | null;
  merge: string | null;
}

export interface ToolsConfig {
  default: ToolCommands;
  extensions: { [key: string]: ToolCommands };
}

export async function loadToolsConfig(): Promise<ToolsConfig> {
  return await invoke('load_tools_config');
}

export async function saveToolsConfig(config: ToolsConfig): Promise<void> {
  await invoke('save_tools_config', { config });
}

export async function detectInstalledTools(): Promise<ToolsConfig> {
  return await invoke('detect_installed_tools');
}

export async function launchExternalDiff(filePath: string): Promise<void> {
  await invoke('launch_external_diff', { filePath });
}

export async function launchExternalMerge(filePath: string): Promise<void> {
  await invoke('launch_external_merge', { filePath });
}

export async function testToolCommand(commandStr: string): Promise<void> {
  await invoke('test_tool_command', { commandStr });
}
