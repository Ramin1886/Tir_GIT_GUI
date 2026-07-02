import { useEffect, useState, useCallback } from 'react';
import { listSubmodules, initSubmodules, updateSubmodules, syncSubmodules, deinitSubmodules, SubmoduleInfo } from '../api/git';
import { useAppStore } from '../store';

import styles from "./SubmodulesView.module.css";

export function SubmodulesView() {
  const [submodules, setSubmodules] = useState<SubmoduleInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { repositoryPath, addRepositoryTab, addToast, autoRefreshInterval } = useAppStore();

  const fetchSubmodules = useCallback(async (isBackground = false) => {
    if (!repositoryPath) return;
    if (!isBackground) setIsLoading(true);
    try {
      const list = await listSubmodules();
      setSubmodules(list);
      setError(null);
    } catch (err) {
      const errMsg = String(err);
      setError(errMsg);
      if (!isBackground) {
        addToast(`Failed to list submodules: ${errMsg}`, 'error');
      }
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, [repositoryPath, addToast]);

  useEffect(() => {
    fetchSubmodules(false);

    if (autoRefreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchSubmodules(true);
    }, autoRefreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefreshInterval, fetchSubmodules]);

  const handleInit = async () => {
    setIsActionLoading(true);
    try {
      await initSubmodules();
      addToast('Submodules initialized successfully', 'success');
      await fetchSubmodules();
    } catch (err) {
      addToast(`Failed to initialize submodules: ${String(err)}`, 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdate = async () => {
    setIsActionLoading(true);
    try {
      await updateSubmodules();
      addToast('Submodules updated successfully', 'success');
      await fetchSubmodules();
    } catch (err) {
      addToast(`Failed to update submodules: ${String(err)}`, 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSync = async () => {
    setIsActionLoading(true);
    try {
      await syncSubmodules();
      addToast('Submodules synchronized successfully', 'success');
      await fetchSubmodules();
    } catch (err) {
      addToast(`Failed to sync submodules: ${String(err)}`, 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeinit = async (subPath: string) => {
    if (!window.confirm(`Are you sure you want to deinit submodule ${subPath}?`)) return;
    setIsActionLoading(true);
    try {
      await deinitSubmodules(subPath);
      addToast(`Submodule ${subPath} deinitialized`, 'success');
      await fetchSubmodules();
    } catch (err) {
      addToast(`Failed to deinit submodule: ${String(err)}`, 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleOpenSubmodule = async (subPath: string) => {
    if (!repositoryPath) return;
    
    // Construct absolute path
    const separator = repositoryPath.endsWith('/') || repositoryPath.endsWith('\\') ? '' : '/';
    const fullPath = `${repositoryPath}${separator}${subPath}`;

    try {
      const success = await addRepositoryTab(fullPath);
      if (success) {
        addToast(`Switched workspace to submodule: ${subPath}`, 'success');
      }
    } catch (err) {
      addToast(`Failed to open submodule repository: ${String(err)}`, 'error');
    }
  };

  return (
    <div className="panel-container">
      <div className="panel-header">
        <div>
          <h2 className={styles.style3}>
            Submodules
          </h2>
          <p className={styles.style4}>
            Manage and traverse git submodules within the current repository workspace
          </p>
        </div>
        <div className={styles.style5}>
          <button
            className="btn btn--secondary"
            onClick={() => fetchSubmodules(false)}
            disabled={isLoading || isActionLoading}>
            Refresh
          </button>
          <button
            className="btn btn--secondary"
            onClick={handleInit}
            disabled={isLoading || isActionLoading}>
            Init Submodules
          </button>
          <button
            className="btn btn--secondary"
            onClick={handleSync}
            disabled={isLoading || isActionLoading}>
            Sync Submodules
          </button>
          <button
            className="btn btn--primary"
            onClick={handleUpdate}
            disabled={isLoading || isActionLoading}>
            {isActionLoading ? 'Updating...' : 'Update Submodules'}
          </button>
        </div>
      </div>
      <div className={styles.style9}>
        {isLoading ? (
          <div className={styles.style10}>
            {[1, 2].map((i) => (
              <div key={i} className="branch-item" />
            ))}
          </div>
        ) : error ? (
          <div
            className={styles.style12}
          >
            <strong>Error loading submodules:</strong> {error}
          </div>
        ) : submodules.length === 0 ? (
          <div
            className={styles.style13}
          >
            <p className={styles.style14}>No submodules found</p>
            <p className={styles.style15}>
              This repository does not have any registered git submodules.
            </p>
          </div>
        ) : (
          <div className={styles.style16}>
            {submodules.map((sm) => (
              <div key={sm.path} className="branch-item">
                <div className={styles.style18}>
                  <div className={styles.style19}>
                    <span
                      className={styles.style20}
                    >
                      {sm.name || sm.path.split('/').pop()}
                    </span>
                    <span
                      className={`badge ${sm.status === 'initialized' ? 'badge--staged' : 'badge--unstaged'}`}
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        backgroundColor: sm.status === 'initialized' ? 'var(--color-toast-success-bg)' : 'var(--color-toast-error-bg)',
                        color: sm.status === 'initialized' ? 'var(--color-toast-success-text)' : 'var(--color-toast-error-text)',
                        border: `1px solid ${sm.status === 'initialized' ? 'var(--color-toast-success-border)' : 'var(--color-toast-error-border)'}`,
                        borderRadius: '12px',
                        textTransform: 'capitalize',
                      }}
                    >
                      {sm.status}
                    </span>
                  </div>
                  <div className={styles.style21}>
                    <div>
                      <span className={styles.style22}>Relative Path:</span> <code className={styles.style23}>{sm.path}</code>
                    </div>
                    <div>
                      <span className={styles.style24}>URL:</span> <code className={styles.style25}>{sm.url || '(none)'}</code>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                  <button className="btn btn--primary" onClick={() => handleOpenSubmodule(sm.path)}>
                    Open Submodule Workspace
                  </button>
                  <button className="btn btn--danger" onClick={() => handleDeinit(sm.path)} disabled={sm.status !== 'initialized'}>
                    Deinit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
