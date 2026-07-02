import React, { useState } from 'react';
import { useAppStore } from '../store';
import { cloneRepository } from '../api/git';

import styles from "./RepoTabBar.module.css";

export function RepoTabBar() {
  const {
    openRepositories,
    activeRepositoryIndex,
    recentRepositories,
    addRepositoryTab,
    closeRepositoryTab,
    selectRepositoryTab,
    removeRecentRepository,
    addToast,
  } = useAppStore();

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [repoPathInput, setRepoPathInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalTab, setModalTab] = useState<'open' | 'clone'>('open');
  const [cloneUrl, setCloneUrl] = useState('');
  const [clonePath, setClonePath] = useState('');

  const getRepoName = (path: string) => {
    // Get folder name from absolute path
    const parts = path.split('/');
    return parts.pop() || parts.pop() || path;
  };

  const handleOpenRepoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPath = repoPathInput.trim();
    if (!cleanPath) return;

    setLoading(true);
    try {
      const success = await addRepositoryTab(cleanPath);
      if (success) {
        addToast(`Opened repository: ${getRepoName(cleanPath)}`, 'success');
        setRepoPathInput('');
        setShowOpenModal(false);
      }
    } catch (err) {
      addToast(`Failed to open repository: ${String(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCloneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = cloneUrl.trim();
    const dest = clonePath.trim();
    if (!url || !dest) return;

    setLoading(true);
    try {
      addToast(`Cloning "${url}" to "${dest}"...`, 'info');
      await cloneRepository(url, dest);
      addToast('Cloned repository successfully', 'success');
      
      const success = await addRepositoryTab(dest);
      if (success) {
        setCloneUrl('');
        setClonePath('');
        setShowOpenModal(false);
      }
    } catch (err) {
      addToast(`Failed to clone repository: ${String(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRecent = async (path: string) => {
    setLoading(true);
    try {
      const success = await addRepositoryTab(path);
      if (success) {
        addToast(`Opened repository: ${getRepoName(path)}`, 'success');
        setShowOpenModal(false);
      }
    } catch (err) {
      addToast(`Failed to open repository: ${String(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="repo-tab-bar">
      <div className="repo-tabs">
        {openRepositories.map((path, index) => {
          const isActive = index === activeRepositoryIndex;
          const repoName = getRepoName(path);

          return (
            <div
              key={path}
              className={`repo-tab ${isActive ? 'repo-tab--active' : ''}`}
              onClick={() => {
                if (!isActive) {
                  selectRepositoryTab(index).catch((err) => {
                    addToast(`Failed to switch repository: ${String(err)}`, 'error');
                  });
                }
              }}
              title={path}
            >
              <span className="repo-tab__name">{repoName}</span>
              <span
                className="repo-tab__close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeRepositoryTab(index);
                }}
              >
                &times;
              </span>
            </div>
          );
        })}

        <button
          className="repo-tab-bar__add-btn"
          onClick={() => setShowOpenModal(true)}
          title="Open Git Repository"
        >
          +
        </button>
      </div>
      {showOpenModal && (
        <div className="modal-overlay" onClick={() => setShowOpenModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                Git Workspace Manager
              </span>
              <button className="modal-close" onClick={() => setShowOpenModal(false)}>
                &times;
              </button>
            </div>

            <div className={styles.style3}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: 'var(--spacing-3)',
                  border: 'none',
                  background: 'none',
                  color: modalTab === 'open' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  fontWeight: modalTab === 'open' ? 600 : 500,
                  borderBottom: modalTab === 'open' ? '2px solid var(--color-accent)' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-sm)',
                }}
                onClick={() => setModalTab('open')}
              >
                Open Repository
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: 'var(--spacing-3)',
                  border: 'none',
                  background: 'none',
                  color: modalTab === 'clone' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  fontWeight: modalTab === 'clone' ? 600 : 500,
                  borderBottom: modalTab === 'clone' ? '2px solid var(--color-accent)' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-sm)',
                }}
                onClick={() => setModalTab('clone')}
              >
                Clone Repository
              </button>
            </div>

            {modalTab === 'clone' ? (
              <form
                onSubmit={handleCloneSubmit}
                className={styles.style4}
              >
                <div className={styles.style5}>
                  <label className={styles.style6}>
                    Repository URL (HTTPS or SSH)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. https://github.com/username/project.git"
                    value={cloneUrl}
                    onChange={(e) => setCloneUrl(e.target.value)}
                    required
                    className={styles.style7}
                  />
                </div>
                <div className={styles.style8}>
                  <label className={styles.style9}>
                    Destination Directory (Absolute Path)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. /home/username/projects/my-project"
                    value={clonePath}
                    onChange={(e) => setClonePath(e.target.value)}
                    required
                    className={styles.style10}
                  />
                </div>
                <div className={styles.style11}>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => setShowOpenModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={loading}
                  >
                    {loading ? 'Cloning...' : 'Clone'}
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={handleOpenRepoSubmit}
                className={styles.style12}
              >
                <div className={styles.style13}>
                  <label
                    className={styles.style14}
                  >
                    Local Repository Absolute Path
                  </label>
                  <div className={styles.style15}>
                    <input
                      type="text"
                      placeholder="e.g. /home/username/projects/my-git-repo"
                      value={repoPathInput}
                      onChange={(e) => setRepoPathInput(e.target.value)}
                      autoFocus
                      required
                      className={styles.style16}
                    />
                    <button type="submit" className="btn btn--primary" disabled={loading}>
                      Open
                    </button>
                  </div>
                </div>

                {recentRepositories.length > 0 && (
                  <div className={styles.style18}>
                    <span
                      className={styles.style19}
                    >
                      Recent Repositories
                    </span>
                    <div className="recent-repos-list">
                      {recentRepositories.map((path) => (
                        <div
                          key={path}
                          className="recent-repo-item"
                          onClick={() => handleSelectRecent(path)}
                        >
                          <div className="recent-repo-details">
                            <span className="recent-repo-name">{getRepoName(path)}</span>
                            <span className="recent-repo-path" title={path}>
                              {path}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="recent-repo-remove"
                            title="Remove from recents"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRecentRepository(path);
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className={styles.style20}
                >
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => setShowOpenModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
