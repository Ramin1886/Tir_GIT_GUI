import { StateCreator } from 'zustand';
import { AppState, IntegrationState } from '../types';
import { setSecret } from '../stronghold';

export const createIntegrationSlice: StateCreator<AppState, [], [], IntegrationState> = (set) => ({
  githubToken: null,
  gitlabToken: null,

  setGitHubToken: async (token) => {
    set({ githubToken: token });
    if (token) await setSecret('githubToken', token);
  },

  setGitLabToken: async (token) => {
    set({ gitlabToken: token });
    if (token) await setSecret('gitlabToken', token);
  },
});
