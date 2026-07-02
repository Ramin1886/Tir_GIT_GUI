import { StateCreator } from 'zustand';
import { AppState, RepositoryState } from '../types';
import { settingsStore } from '../settingsStore';
import { openRepository } from '../../api/git';

export const createRepositorySlice: StateCreator<AppState, [], [], RepositoryState> = (set, get) => ({
  repositoryPath: null,
  defaultRepoPath: '',
  autoRefreshInterval: 10000,
  openRepositories: [],
  activeRepositoryIndex: 0,
  recentRepositories: [],
  historyFileFilter: null,

  setRepositoryPath: (path) => set({ repositoryPath: path }),

  setDefaultRepoPath: async (path) => {
    set({ defaultRepoPath: path });
    await settingsStore.set('defaultRepoPath', path);
    await settingsStore.save();
  },

  setAutoRefreshInterval: async (interval) => {
    set({ autoRefreshInterval: interval });
    await settingsStore.set('autoRefreshInterval', interval);
    await settingsStore.save();
  },

  updateChannel: 'Stable',
  setUpdateChannel: async (channel) => {
    set({ updateChannel: channel });
    await settingsStore.set('updateChannel', channel);
    await settingsStore.save();
  },

  setHistoryFileFilter: (filter) => set({ historyFileFilter: filter }),

  addRepositoryTab: async (path) => {
    const normalizedPath = path.trim();
    if (!normalizedPath) return false;

    const { openRepositories, recentRepositories } = get();
    const existingIndex = openRepositories.findIndex(
      (p) => p.toLowerCase() === normalizedPath.toLowerCase()
    );

    try {
      await openRepository(normalizedPath);

      let newRecents = [
        normalizedPath,
        ...recentRepositories.filter((p) => p.toLowerCase() !== normalizedPath.toLowerCase()),
      ];
      newRecents = newRecents.slice(0, 10);

      let newOpen = [...openRepositories];
      let newActiveIndex = existingIndex;

      if (existingIndex === -1) {
        newOpen.push(normalizedPath);
        newActiveIndex = newOpen.length - 1;
      }

      set({
        openRepositories: newOpen,
        activeRepositoryIndex: newActiveIndex,
        recentRepositories: newRecents,
        repositoryPath: normalizedPath,
      });

      await settingsStore.set('openRepositories', newOpen);
      await settingsStore.set('activeRepositoryIndex', newActiveIndex);
      await settingsStore.set('recentRepositories', newRecents);
      await settingsStore.save();

      return true;
    } catch (err) {
      throw err;
    }
  },

  closeRepositoryTab: async (index) => {
    const { openRepositories, activeRepositoryIndex } = get();
    if (index < 0 || index >= openRepositories.length) return;

    const newOpen = openRepositories.filter((_, i) => i !== index);
    let newActiveIndex = activeRepositoryIndex;

    if (newOpen.length === 0) {
      newActiveIndex = 0;
      set({
        openRepositories: newOpen,
        activeRepositoryIndex: newActiveIndex,
        repositoryPath: null,
      });
    } else {
      if (activeRepositoryIndex >= newOpen.length) {
        newActiveIndex = newOpen.length - 1;
      } else if (activeRepositoryIndex === index) {
        newActiveIndex = Math.max(0, index - 1);
      } else if (activeRepositoryIndex > index) {
        newActiveIndex = activeRepositoryIndex - 1;
      }

      const activePath = newOpen[newActiveIndex];
      try {
        await openRepository(activePath);
        set({
          openRepositories: newOpen,
          activeRepositoryIndex: newActiveIndex,
          repositoryPath: activePath,
        });
      } catch {
        set({
          openRepositories: newOpen,
          activeRepositoryIndex: newActiveIndex,
          repositoryPath: activePath,
        });
      }
    }

    await settingsStore.set('openRepositories', newOpen);
    await settingsStore.set('activeRepositoryIndex', newActiveIndex);
    await settingsStore.save();
  },

  selectRepositoryTab: async (index) => {
    const { openRepositories } = get();
    if (index < 0 || index >= openRepositories.length) return;

    const path = openRepositories[index];
    try {
      await openRepository(path);
      set({
        activeRepositoryIndex: index,
        repositoryPath: path,
      });
      await settingsStore.set('activeRepositoryIndex', index);
      await settingsStore.save();
    } catch (err) {
      throw err;
    }
  },

  removeRecentRepository: async (path) => {
    const { recentRepositories } = get();
    const newRecents = recentRepositories.filter((p) => p !== path);
    set({ recentRepositories: newRecents });
    await settingsStore.set('recentRepositories', newRecents);
    await settingsStore.save();
  },
});
