import React, { useEffect, useState, useCallback } from 'react';
import { listStashes, saveStash, applyStash, popStash, dropStash, branchFromStash, StashInfo, getCommitDetails, CommitDetails } from '../api/git';
import { useAppStore } from '../store';
import { DiffViewer } from './DiffViewer';

import styles from "./StashesView.module.css";

export function StashesView() {
  const [stashes, setStashes] = useState<StashInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stashMessage, setStashMessage] = useState('');
  const [includeUntracked, setIncludeUntracked] = useState(false);
  
  // Stash branching modal state
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [selectedStashIndex, setSelectedStashIndex] = useState<number | null>(null);
  const [newBranchName, setNewBranchName] = useState('');

  // Stash diff viewer state
  const [stashDetails, setStashDetails] = useState<CommitDetails | null>(null);
  const [selectedDiffPath, setSelectedDiffPath] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const { autoRefreshInterval, addToast } = useAppStore();

  const fetchStashes = useCallback(async (isBackground = false) => {
    try {
      const result = await listStashes();
      setStashes(result);
      setError(null);
    } catch (err) {
      const errMsg = String(err);
      setError(errMsg);
      if (!isBackground) {
        addToast(`Failed to load stashes: ${errMsg}`, 'error');
      }
    }
  }, [addToast]);

  useEffect(() => {
    fetchStashes(false);

    if (autoRefreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchStashes(true);
    }, autoRefreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefreshInterval, fetchStashes]);

  const handleCreateStash = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveStash(stashMessage.trim() || undefined, includeUntracked);
      addToast('Stash created successfully', 'success');
      setStashMessage('');
      setIncludeUntracked(false);
      setShowCreateModal(false);
      fetchStashes();
    } catch (err) {
      addToast(`Failed to create stash: ${String(err)}`, 'error');
    }
  };

  const handleApply = async (index: number) => {
    try {
      await applyStash(index);
      addToast(`Applied stash@{${index}}`, 'success');
      fetchStashes();
    } catch (err) {
      addToast(`Failed to apply stash: ${String(err)}`, 'error');
    }
  };

  const handlePop = async (index: number) => {
    try {
      await popStash(index);
      addToast(`Popped stash@{${index}}`, 'success');
      fetchStashes();
    } catch (err) {
      addToast(`Failed to pop stash: ${String(err)}`, 'error');
    }
  };

  const handleDrop = async (index: number) => {
    if (!window.confirm(`Are you sure you want to drop stash@{${index}}?`)) {
      return;
    }
    try {
      await dropStash(index);
      addToast(`Dropped stash@{${index}}`, 'success');
      fetchStashes();
    } catch (err) {
      addToast(`Failed to drop stash: ${String(err)}`, 'error');
    }
  };

  const handleBranchFromStash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStashIndex === null || !newBranchName.trim()) {
      addToast('Branch name cannot be empty', 'error');
      return;
    }
    try {
      await branchFromStash(selectedStashIndex, newBranchName.trim());
      addToast(`Created branch "${newBranchName}" from stash@{${selectedStashIndex}}`, 'success');
      setNewBranchName('');
      setSelectedStashIndex(null);
      setShowBranchModal(false);
      fetchStashes();
    } catch (err) {
      addToast(`Failed to create branch from stash: ${String(err)}`, 'error');
    }
  };

  const handleSelectStash = async (stash: StashInfo) => {
    if (selectedStashIndex === stash.index) return;
    setSelectedStashIndex(stash.index);
    setDetailsLoading(true);
    setStashDetails(null);
    setSelectedDiffPath(null);
    try {
      const details = await getCommitDetails(stash.id);
      setStashDetails(details);
      if (details.files && details.files.length > 0) {
        setSelectedDiffPath(details.files[0]);
      }
    } catch (err) {
      addToast(`Failed to load stash details: ${String(err)}`, 'error');
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="branches-view"> {/* Reuses layout container rules */}
      <div className="branches-view__header">
        <h2 className="branches-view__title">Stashes</h2>
        <div className="branches-view__actions">
          <button
            className="btn btn--primary"
            onClick={() => setShowCreateModal(true)}
          >
            Create Stash
          </button>
        </div>
      </div>
      <div className="history-view__split-container" style={{ borderTop: '1px solid var(--color-border)' }}>
        <div className="history-view__list-panel" style={{ padding: 'var(--spacing-4)' }}>
          {error && <p className={styles.style2}>Error: {error}</p>}

          <div className="branch-list">
            {stashes.length === 0 ? (
              <p className={styles.style4}>
                No stashes found in this repository.
              </p>
            ) : (
              stashes.map((stash) => (
                <div 
                  key={`${stash.id}-${stash.index}`} 
                  className={`branch-item ${selectedStashIndex === stash.index ? 'branch-item--active' : ''}`}
                  onClick={() => handleSelectStash(stash)}
                  style={{ cursor: 'pointer', backgroundColor: selectedStashIndex === stash.index ? 'var(--color-bg-tertiary)' : undefined }}
                >
                  <div className="branch-item__details">
                    <span className="branch-item__name">
                      stash@&#123;{stash.index}&#125;: {stash.message}
                    </span>
                    <span className={styles.style8}>
                      Commit: {stash.id.substring(0, 8)}
                    </span>
                  </div>
                  <div className="branch-item__actions">
                    <button
                      className="btn btn--secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStashIndex(stash.index);
                        setNewBranchName('');
                        setShowBranchModal(true);
                      }}>
                      Branch
                    </button>
                    <button className="btn btn--secondary" onClick={(e) => { e.stopPropagation(); handleApply(stash.index); }}>
                      Apply
                    </button>
                    <button className="btn btn--secondary" onClick={(e) => { e.stopPropagation(); handlePop(stash.index); }}>
                      Pop
                    </button>
                    <button className="btn btn--danger" onClick={(e) => { e.stopPropagation(); handleDrop(stash.index); }}>
                      Drop
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedStashIndex !== null && (
          <div className="history-view__detail-panel" style={{ padding: 'var(--spacing-4)' }}>
            {detailsLoading ? (
              <p>Loading stash details...</p>
            ) : stashDetails ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 'var(--spacing-4)' }}>
                <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--spacing-3)' }}>
                  <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-2)' }}>Files in Stash@{selectedStashIndex}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)', maxHeight: '200px', overflowY: 'auto' }}>
                    {stashDetails.files.map(file => (
                      <div 
                        key={file} 
                        onClick={() => setSelectedDiffPath(file)}
                        style={{
                          padding: 'var(--spacing-2) var(--spacing-3)',
                          cursor: 'pointer',
                          backgroundColor: selectedDiffPath === file ? 'var(--color-bg-secondary)' : 'transparent',
                          borderRadius: 'var(--border-radius)',
                          fontFamily: 'monospace',
                          fontSize: 'var(--font-size-sm)'
                        }}
                      >
                        {file}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {selectedDiffPath ? (
                    <DiffViewer path={selectedDiffPath} commitId={stashDetails.id} />
                  ) : (
                    <p>Select a file to view diff</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Create Stash</span>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateStash} className={styles.style16}>
              <div className={styles.style17}>
                <label className={styles.style18}>Stash Message (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Work in progress on login"
                  value={stashMessage}
                  onChange={(e) => setStashMessage(e.target.value)}
                  autoFocus
                  className={styles.style19}
                />
              </div>
              <div className={styles.style20}>
                <input
                  type="checkbox"
                  id="include-untracked-check"
                  checked={includeUntracked}
                  onChange={(e) => setIncludeUntracked(e.target.checked)}
                  className={styles.style21}
                />
                <label htmlFor="include-untracked-check" className={styles.style22}>
                  Include Untracked Files
                </label>
              </div>
              <div className={styles.style23}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showBranchModal && (
        <div className="modal-overlay" onClick={() => { setShowBranchModal(false); setSelectedStashIndex(null); }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Branch from Stash</span>
              <button className="modal-close" onClick={() => { setShowBranchModal(false); setSelectedStashIndex(null); }}>
                &times;
              </button>
            </div>
            <form onSubmit={handleBranchFromStash} className={styles.style26}>
              <div className={styles.style27}>
                <label className={styles.style28}>
                  New Branch Name (from stash@&#123;{selectedStashIndex}&#125;)
                </label>
                <input
                  type="text"
                  placeholder="e.g. feature-login-restore"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  autoFocus
                  className={styles.style29}
                />
              </div>
              <div className={styles.style30}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => { setShowBranchModal(false); setSelectedStashIndex(null); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                >
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
