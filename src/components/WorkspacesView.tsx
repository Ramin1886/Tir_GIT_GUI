import React, { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../store';
import { getRepoSummary, RepoSummary } from '../api/git';

import styles from "./WorkspacesView.module.css";

export function WorkspacesView() {
  const {
    workspaces,
    addWorkspace,
    removeWorkspace,
    addRepoToWorkspace,
    removeRepoFromWorkspace,
    addRepositoryTab,
    addToast
  } = useAppStore();

  const [activeWorkspaceName, setActiveWorkspaceName] = useState<string>('');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newRepoPath, setNewRepoPath] = useState('');
  const [repoSummaries, setRepoSummaries] = useState<Map<string, RepoSummary>>(new Map());
  const [loadingSummaries, setLoadingSummaries] = useState<Set<string>>(new Set());

  // Initialize active workspace
  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspaceName) {
      setActiveWorkspaceName(workspaces[0].name);
    }
  }, [workspaces, activeWorkspaceName]);

  const activeWorkspace = workspaces.find((w) => w.name === activeWorkspaceName);

  // Fetch summaries for repositories in active workspace
  const fetchSummaries = useCallback(async () => {
    if (!activeWorkspace) return;
    const paths = activeWorkspace.repositories;
    
    // Set loading
    setLoadingSummaries(new Set(paths));

    const fetchedResults = new Map<string, RepoSummary>();
    await Promise.all(
      paths.map(async (path) => {
        try {
          const summary = await getRepoSummary(path);
          fetchedResults.set(path, summary);
        } catch (err) {
          // If repo path invalid or cannot open
          console.error(`Failed to get summary for ${path}:`, err);
        } finally {
          setLoadingSummaries((prev) => {
            const next = new Set(prev);
            next.delete(path);
            return next;
          });
        }
      })
    );
    setRepoSummaries((prev) => {
      const newSummaries = new Map(prev);
      fetchedResults.forEach((val, key) => newSummaries.set(key, val));
      return newSummaries;
    });
  }, [activeWorkspace]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const handleAddWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newWorkspaceName.trim();
    if (!name) return;
    try {
      await addWorkspace(name);
      setActiveWorkspaceName(name);
      setNewWorkspaceName('');
      addToast(`Workspace "${name}" created`, 'success');
    } catch (err) {
      addToast(`Failed to create workspace: ${String(err)}`, 'error');
    }
  };

  const handleRemoveWorkspace = async (name: string) => {
    if (!window.confirm(`Are you sure you want to remove workspace "${name}"?\nRepositories will not be deleted from disk.`)) {
      return;
    }
    try {
      await removeWorkspace(name);
      setActiveWorkspaceName(workspaces.find((w) => w.name !== name)?.name || '');
      addToast(`Workspace "${name}" removed`, 'success');
    } catch (err) {
      addToast(`Failed to remove workspace: ${String(err)}`, 'error');
    }
  };

  const handleAddRepoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = newRepoPath.trim();
    if (!path || !activeWorkspaceName) return;
    try {
      await addRepoToWorkspace(activeWorkspaceName, path);
      setNewRepoPath('');
      addToast(`Repository added to workspace`, 'success');
    } catch (err) {
      addToast(`Failed to add repository: ${String(err)}`, 'error');
    }
  };

  const handleRemoveRepo = async (repoPath: string) => {
    if (!activeWorkspaceName) return;
    try {
      await removeRepoFromWorkspace(activeWorkspaceName, repoPath);
      addToast('Repository removed from workspace', 'success');
    } catch (err) {
      addToast(`Failed to remove repository: ${String(err)}`, 'error');
    }
  };

  const handleOpenRepo = async (repoPath: string) => {
    try {
      addToast(`Opening repository workspace...`, 'info');
      await addRepositoryTab(repoPath);
    } catch (err) {
      addToast(`Failed to open repository: ${String(err)}`, 'error');
    }
  };

  const getRepoName = (path: string) => {
    const parts = path.split('/');
    return parts.pop() || parts.pop() || path;
  };

  return (
    <div className="workspaces-view">
      {/* Workspaces Sidebar */}
      <div className="workspaces-sidebar">
        <div className={styles.style3}>
          <h3 className={styles.style4}>Workspaces</h3>
        </div>

        <div className={styles.style5}>
          {workspaces.length === 0 ? (
            <p className={styles.style6}>
              No workspaces defined yet.
            </p>
          ) : (
            <div className={styles.style7}>
              {workspaces.map((w) => {
                const isActive = w.name === activeWorkspaceName;
                return (
                  <div
                    key={w.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--spacing-2) var(--spacing-3)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: isActive ? 'var(--color-bg-tertiary)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: 'var(--font-size-sm)',
                    }}
                    onClick={() => setActiveWorkspaceName(w.name)}
                  >
                    <span style={{ fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>
                      📁 {w.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveWorkspace(w.name);
                      }}
                      title="Delete workspace"
                      className={styles.style8}
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <form onSubmit={handleAddWorkspaceSubmit} className={styles.style9}>
          <input
            type="text"
            placeholder="New workspace name..."
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            required
            className={styles.style10}
          />
          <button type="submit" className="btn btn--primary">
            Add Workspace
          </button>
        </form>
      </div>
      {/* Workspace Dashboard Main Content */}
      <div className="workspaces-content">
        {activeWorkspace ? (
          <div className={styles.style13}>
            
            {/* Header */}
            <div className={styles.style14}>
              <div>
                <h2 className={styles.style15}>{activeWorkspace.name}</h2>
                <span className={styles.style16}>
                  Combined status overview of {activeWorkspace.repositories.length} repositories
                </span>
              </div>
              <button className="btn btn--secondary" onClick={fetchSummaries}>
                Refresh Summary
              </button>
            </div>

            {/* Repos list table */}
            <div className={styles.style17}>
              {activeWorkspace.repositories.length === 0 ? (
                <div className={styles.style18}>
                  No repositories added to this workspace. Add one below to see statuses!
                </div>
              ) : (
                <table className={styles.style19}>
                  <thead>
                    <tr className={styles.style20}>
                      <th className={styles.style21}>Repository</th>
                      <th className={styles.style22}>Active Branch</th>
                      <th className={styles.style23}>Changes</th>
                      <th className={styles.style24}>Ahead/Behind</th>
                      <th className={styles.style25}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeWorkspace.repositories.map((path) => {
                      const summary = repoSummaries.get(path);
                      const isLoading = loadingSummaries.has(path);

                      return (
                        <tr key={path} className={styles.style26}>
                          <td className={styles.style27}>
                            <div className={styles.style28}>
                              <span className={styles.style29}>{getRepoName(path)}</span>
                              <span className={styles.style30}>{path}</span>
                            </div>
                          </td>
                          <td className={styles.style31}>
                            {isLoading ? (
                              <span className={styles.style32}>Loading...</span>
                            ) : summary ? (
                              <span className={styles.style33}>
                                ⎇ {summary.active_branch}
                              </span>
                            ) : (
                              <span className={styles.style34}>Offline/Error</span>
                            )}
                          </td>
                          <td className={styles.style35}>
                            {isLoading ? (
                              '-'
                            ) : summary ? (
                              summary.uncommitted_changes_count > 0 ? (
                                <span className="badge badge--unstaged">
                                  {summary.uncommitted_changes_count} changes
                                </span>
                              ) : (
                                <span className="badge badge--staged">
                                  Clean
                                </span>
                              )
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className={styles.style38}>
                            {isLoading ? (
                              '-'
                            ) : summary ? (
                              <div className={styles.style39}>
                                {summary.ahead > 0 && (
                                  <span className={styles.style40}>
                                    ↑ {summary.ahead}
                                  </span>
                                )}
                                {summary.behind > 0 && (
                                  <span className={styles.style41}>
                                    ↓ {summary.behind}
                                  </span>
                                )}
                                {summary.ahead === 0 && summary.behind === 0 && (
                                  <span className={styles.style42}>In Sync</span>
                                )}
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className={styles.style43}>
                            <div className={styles.style44}>
                              <button className="btn btn--primary" onClick={() => handleOpenRepo(path)}>
                                Open tab
                              </button>
                              <button className="btn btn--danger" onClick={() => handleRemoveRepo(path)}>
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Add Repo Form */}
            <form onSubmit={handleAddRepoSubmit} className={styles.style47}>
              <input
                type="text"
                placeholder="Absolute path to Git repository to add... e.g. /home/user/my-repo"
                value={newRepoPath}
                onChange={(e) => setNewRepoPath(e.target.value)}
                required
                className={styles.style48}
              />
              <button type="submit" className="btn btn--primary">
                Add Repo
              </button>
            </form>

          </div>
        ) : (
          <div className={styles.style49}>
            <span>📁 Select or create a Workspace to get started</span>
          </div>
        )}
      </div>
    </div>
  );
}
