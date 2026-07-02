import { useEffect, useState, type ReactNode } from 'react';

import { CommandPalette } from './components/CommandPalette';
import { useAppStore, View } from './store';
import { WorkingTree } from './components/WorkingTree';
import { HistoryView } from './components/HistoryView';
import { BranchesView } from './components/BranchesView';
import { StashesView } from './components/StashesView';
import { TagsView } from './components/TagsView';
import { RemotesView } from './components/RemotesView';
import { SettingsView } from './components/SettingsView';
import { SubmodulesView } from './components/SubmodulesView';
import { ToastContainer } from './components/ToastContainer';
import { RepoTabBar } from './components/RepoTabBar';
import { openRepository } from './api/git';
import { GitFlowView } from './components/GitFlowView';
import { UndoBanner } from './components/UndoBanner';
import { GitHooksView } from './components/GitHooksView';
import { PullRequestsView } from './components/PullRequestsView';
import { WorkspacesView } from './components/WorkspacesView';
import { EmptyState } from './components/EmptyState';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UpdateBanner } from './components/UpdateBanner';

const VIEWS: { id: View; label: string }[] = [
  { id: 'WORKING_TREE', label: 'Working Tree' },
  { id: 'HISTORY', label: 'History' },
  { id: 'BRANCHES', label: 'Branches' },
  { id: 'STASHES', label: 'Stashes' },
  { id: 'TAGS', label: 'Tags' },
  { id: 'REMOTES', label: 'Remotes' },
  { id: 'SUBMODULES', label: 'Submodules' },
  { id: 'GIT_FLOW', label: 'Git Flow' },
  { id: 'GIT_HOOKS', label: 'Git Hooks' },
  { id: 'PULL_REQUESTS', label: 'Pull Requests' },
  { id: 'WORKSPACES', label: 'Workspaces' },
  { id: 'SETTINGS', label: 'Settings' },
];

const VIEW_COMPONENTS: Record<View, ReactNode> = {
  WORKING_TREE:  <WorkingTree />,
  HISTORY:       <HistoryView />,
  BRANCHES:      <BranchesView />,
  STASHES:       <StashesView />,
  TAGS:          <TagsView />,
  REMOTES:       <RemotesView />,
  SUBMODULES:    <SubmodulesView />,
  GIT_FLOW:      <GitFlowView />,
  GIT_HOOKS:     <GitHooksView />,
  PULL_REQUESTS: <PullRequestsView />,
  WORKSPACES:    <WorkspacesView />,
  SETTINGS:      <SettingsView />,
};

function App() {
  const { currentView, setCurrentView, addToast, loadSettings } = useAppStore();
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
      
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 9) {
          const viewIndex = num - 1;
          if (viewIndex < VIEWS.length) {
            e.preventDefault();
            setCurrentView(VIEWS[viewIndex].id);
            addToast(`Switched to view: ${VIEWS[viewIndex].label}`, 'info');
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentView, addToast]);

  useEffect(() => {
    async function initApp() {
      await loadSettings();
      
      const state = useAppStore.getState();
      const { openRepositories, activeRepositoryIndex } = state;

      if (openRepositories.length > 0) {
        const activeIdx = activeRepositoryIndex < openRepositories.length ? activeRepositoryIndex : 0;
        const pathToOpen = openRepositories[activeIdx];
        openRepository(pathToOpen)
          .then(() => {
            useAppStore.setState({ repositoryPath: pathToOpen, activeRepositoryIndex: activeIdx });
          })
          .catch((err) => {
            addToast(`Failed to open repository: ${String(err)}`, 'error');
          });
      }
    }
    initApp();
  }, [addToast, loadSettings]);

  return (
    <div className="app-layout">
      <UpdateBanner />
      <RepoTabBar />
      <div className="app-container">
        <div className="sidebar">
          <div className="sidebar-header">
            <img src="/logo.png" alt="Tir Logo" className="sidebar-logo" />
            <h2 className="sidebar-title">Tir</h2>
          </div>
          <div className="sidebar-menu">
            {VIEWS.map((view) => (
              <div
                key={view.id}
              className={`sidebar__item ${currentView === view.id ? 'sidebar__item--active' : ''}`}
              onClick={() => setCurrentView(view.id)}
            >
              {view.label}
              </div>
            ))}
          </div>
        </div>
        <div className="main-content">
          {useAppStore(s => s.openRepositories).length === 0 ? (
            <EmptyState />
          ) : (
            <ErrorBoundary>
              {VIEW_COMPONENTS[currentView] ?? (
                <div style={{ padding: '2rem' }}>
                  <h2>{VIEWS.find((v) => v.id === currentView)?.label}</h2>
                  <p>This view is not implemented yet.</p>
                </div>
              )}
            </ErrorBoundary>
          )}
        </div>
        <ToastContainer />
        <UndoBanner />
      </div>
      {showCommandPalette && (
        <CommandPalette onClose={() => setShowCommandPalette(false)} />
      )}
    </div>
  );
}

export default App;
