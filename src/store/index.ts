import { create } from 'zustand';
import { AppState } from './types';
import { settingsStore } from './settingsStore';
import { getSecret } from './stronghold';
import { createUISlice, applyTheme } from './slices/uiSlice';
import { createRepositorySlice } from './slices/repositorySlice';
import { createWorkspaceSlice } from './slices/workspaceSlice';
import { createIntegrationSlice } from './slices/integrationSlice';

export * from './types';

export const useAppStore = create<AppState>((...a) => ({
  ...createUISlice(...a),
  ...createRepositorySlice(...a),
  ...createWorkspaceSlice(...a),
  ...createIntegrationSlice(...a),

  loadSettings: async () => {
    const [set] = a;
    try {
      const themeVal = (await settingsStore.get<'system' | 'light' | 'dark'>('theme')) || 'system';
      const defaultRepoVal = (await settingsStore.get<string>('defaultRepoPath')) || '';
      const intervalVal = (await settingsStore.get<number>('autoRefreshInterval')) ?? 10000;
      const updateChannelVal = (await settingsStore.get<'Stable' | 'Beta' | 'Nightly'>('updateChannel')) || 'Stable';

      const openReposVal = (await settingsStore.get<string[]>('openRepositories')) || [];
      const activeIdxVal = (await settingsStore.get<number>('activeRepositoryIndex')) ?? 0;
      const recentReposVal = (await settingsStore.get<string[]>('recentRepositories')) || [];

      const githubTokenVal = await getSecret('githubToken');
      const gitlabTokenVal = await getSecret('gitlabToken');

      const workspacesVal =
        (await settingsStore.get<{ name: string; repositories: string[] }[]>('workspaces')) || [];

      applyTheme(themeVal);
      set({
        theme: themeVal,
        defaultRepoPath: defaultRepoVal,
        autoRefreshInterval: intervalVal,
        updateChannel: updateChannelVal,
        openRepositories: openReposVal,
        activeRepositoryIndex: activeIdxVal,
        recentRepositories: recentReposVal,
        githubToken: githubTokenVal,
        gitlabToken: gitlabTokenVal,
        workspaces: workspacesVal,
      });
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  },
}));
