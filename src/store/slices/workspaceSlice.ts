import { StateCreator } from 'zustand';
import { AppState, WorkspaceState } from '../types';
import { settingsStore } from '../settingsStore';

export const createWorkspaceSlice: StateCreator<AppState, [], [], WorkspaceState> = (set) => ({
  workspaces: [],

  addWorkspace: async (name) => {
    set((state) => {
      if (state.workspaces.some((w) => w.name.toLowerCase() === name.toLowerCase())) {
        return state;
      }
      const newWorkspaces = [...state.workspaces, { name, repositories: [] }];
      settingsStore.set('workspaces', newWorkspaces).then(() => settingsStore.save());
      return { workspaces: newWorkspaces };
    });
  },

  removeWorkspace: async (name) => {
    set((state) => {
      const newWorkspaces = state.workspaces.filter((w) => w.name !== name);
      settingsStore.set('workspaces', newWorkspaces).then(() => settingsStore.save());
      return { workspaces: newWorkspaces };
    });
  },

  addRepoToWorkspace: async (workspaceName, repoPath) => {
    set((state) => {
      const newWorkspaces = state.workspaces.map((w) => {
        if (w.name === workspaceName) {
          if (w.repositories.includes(repoPath)) return w;
          return { ...w, repositories: [...w.repositories, repoPath] };
        }
        return w;
      });
      settingsStore.set('workspaces', newWorkspaces).then(() => settingsStore.save());
      return { workspaces: newWorkspaces };
    });
  },

  removeRepoFromWorkspace: async (workspaceName, repoPath) => {
    set((state) => {
      const newWorkspaces = state.workspaces.map((w) => {
        if (w.name === workspaceName) {
          return { ...w, repositories: w.repositories.filter((p) => p !== repoPath) };
        }
        return w;
      });
      settingsStore.set('workspaces', newWorkspaces).then(() => settingsStore.save());
      return { workspaces: newWorkspaces };
    });
  },
});
