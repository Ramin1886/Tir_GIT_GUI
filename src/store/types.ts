export type View =
  | 'WORKING_TREE'
  | 'HISTORY'
  | 'BRANCHES'
  | 'STASHES'
  | 'TAGS'
  | 'REMOTES'
  | 'SETTINGS'
  | 'SUBMODULES'
  | 'GIT_FLOW'
  | 'GIT_HOOKS'
  | 'GIT_LFS'
  | 'PULL_REQUESTS'
  | 'WORKSPACES';

export interface Toast {
  id: string;
  message: string;
  type: 'error' | 'info' | 'success';
}

export interface UIState {
  currentView: View;
  toasts: Toast[];
  theme: 'system' | 'light' | 'dark';
  setCurrentView: (view: View) => void;
  addToast: (message: string, type?: 'error' | 'info' | 'success') => void;
  removeToast: (id: string) => void;
  setTheme: (theme: 'system' | 'light' | 'dark') => Promise<void>;
}

export interface RepositoryState {
  repositoryPath: string | null;
  defaultRepoPath: string;
  autoRefreshInterval: number;
  updateChannel: 'Stable' | 'Beta' | 'Nightly';
  openRepositories: string[];
  activeRepositoryIndex: number;
  recentRepositories: string[];
  historyFileFilter: string | null;
  setRepositoryPath: (path: string | null) => void;
  setDefaultRepoPath: (path: string) => Promise<void>;
  setAutoRefreshInterval: (interval: number) => Promise<void>;
  setUpdateChannel: (channel: 'Stable' | 'Beta' | 'Nightly') => Promise<void>;
  setHistoryFileFilter: (filter: string | null) => void;
  addRepositoryTab: (path: string) => Promise<boolean>;
  closeRepositoryTab: (index: number) => Promise<void>;
  selectRepositoryTab: (index: number) => Promise<void>;
  removeRecentRepository: (path: string) => Promise<void>;
}

export interface WorkspaceState {
  workspaces: { name: string; repositories: string[] }[];
  addWorkspace: (name: string) => Promise<void>;
  removeWorkspace: (name: string) => Promise<void>;
  addRepoToWorkspace: (workspaceName: string, repoPath: string) => Promise<void>;
  removeRepoFromWorkspace: (workspaceName: string, repoPath: string) => Promise<void>;
}

export interface IntegrationState {
  githubToken: string | null;
  gitlabToken: string | null;
  gitlabApiUrl: string | null;
  setGitHubToken: (token: string | null) => Promise<void>;
  setGitLabToken: (token: string | null) => Promise<void>;
  setGitLabApiUrl: (url: string | null) => Promise<void>;
}

export interface AppState extends UIState, RepositoryState, WorkspaceState, IntegrationState {
  loadSettings: () => Promise<void>;
}
