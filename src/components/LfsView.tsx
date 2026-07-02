import React, { useEffect, useState, useCallback } from 'react';
import { trackLfsPatterns, listTrackedLfsPatterns, listLfsLocks, pushLfs, LfsLockInfo } from '../api/git/lfs';
import { listRemotes, RemoteInfo } from '../api/git';
import { useAppStore } from '../store';

import styles from "./LfsView.module.css";

export function LfsView() {
  const [trackedPatterns, setTrackedPatterns] = useState<string[]>([]);
  const [locks, setLocks] = useState<LfsLockInfo[]>([]);
  const [remotes, setRemotes] = useState<RemoteInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forms
  const [newPattern, setNewPattern] = useState('');
  const [selectedRemote, setSelectedRemote] = useState('');
  const [pushBranch, setPushBranch] = useState('main'); // default branch

  const { repositoryPath, autoRefreshInterval, addToast } = useAppStore();

  const fetchData = useCallback(async (isBackground = false) => {
    if (!repositoryPath) return;
    if (!isBackground) setIsLoading(true);
    try {
      const [patternsList, locksList, remotesList] = await Promise.all([
        listTrackedLfsPatterns().catch(() => []),
        listLfsLocks().catch(() => []),
        listRemotes().catch(() => [])
      ]);
      setTrackedPatterns(patternsList);
      setLocks(locksList);
      setRemotes(remotesList);
      
      if (!selectedRemote && remotesList.length > 0) {
        setSelectedRemote(remotesList[0].name);
      }
      
      setError(null);
    } catch (err) {
      const errMsg = String(err);
      setError(errMsg);
      if (!isBackground) {
        addToast(`Failed to load LFS data: ${errMsg}`, 'error');
      }
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, [repositoryPath, addToast, selectedRemote]);

  useEffect(() => {
    fetchData(false);

    if (autoRefreshInterval <= 0) return;
    const intervalId = setInterval(() => {
      fetchData(true);
    }, autoRefreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefreshInterval, fetchData]);

  const handleTrackPattern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPattern.trim()) return;
    
    setIsActionLoading(true);
    try {
      await trackLfsPatterns([newPattern.trim()]);
      addToast(`Tracking new LFS pattern: ${newPattern}`, 'success');
      setNewPattern('');
      await fetchData(true);
    } catch (err) {
      addToast(`Failed to track pattern: ${String(err)}`, 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRemote || !pushBranch) return;
    
    setIsActionLoading(true);
    try {
      const output = await pushLfs(selectedRemote, pushBranch);
      addToast(`LFS push to ${selectedRemote}/${pushBranch} successful.\n${output}`, 'success');
    } catch (err) {
      addToast(`LFS push failed: ${String(err)}`, 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (!repositoryPath) {
    return (
      <div className="panel-container">
        <div className="panel-header">
          <h2>Git LFS</h2>
        </div>
        <div className={styles.style16}>
          <p>No repository selected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-container">
      <div className="panel-header">
        <div>
          <h2>Git LFS</h2>
          <p className={styles.style4}>
            Manage Large File Storage tracking, locks, and synchronization.
          </p>
        </div>
        <button
          className="btn btn--secondary"
          onClick={() => fetchData(false)}
          disabled={isLoading || isActionLoading}>
          Refresh
        </button>
      </div>
      
      <div className="panel-content">
        {error && <p className="error-text">Error: {error}</p>}
        
        <div className={styles.style1}>
          
          {/* Tracking Section */}
          <div className={styles.style2}>
            <h3 className={styles.style3}>Tracked Patterns</h3>
            <p className={styles.style4}>Files matching these patterns are managed by Git LFS.</p>
            
            <form onSubmit={handleTrackPattern} className={styles.style5}>
              <input
                type="text"
                placeholder="e.g., *.psd, assets/**/*.mp4"
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                disabled={isActionLoading}
                className={styles.style6}
              />
              <button
                type="submit"
                className="btn btn--primary"
                disabled={isActionLoading || !newPattern.trim()}
              >
                Track Pattern
              </button>
            </form>

            <div className={styles.style7}>
              {trackedPatterns.length === 0 ? (
                <p className={styles.style4}>No tracked patterns found.</p>
              ) : (
                trackedPatterns.map((pattern, idx) => (
                  <div key={idx} className={styles.style8}>
                    <code className={styles.style9}>{pattern}</code>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Locks Section */}
          <div className={styles.style2}>
            <h3 className={styles.style3}>Active Locks</h3>
            <p className={styles.style4}>Files currently locked by your team on the LFS server.</p>
            
            {locks.length === 0 ? (
              <p className={styles.style4}>No active locks found.</p>
            ) : (
              <div className={styles.style10}>
                {locks.map((lock) => (
                  <div key={lock.id} className={styles.style11}>
                    <div className={styles.style12}>
                      <span className={styles.style13}>{lock.path}</span>
                      <span className={styles.style14}>ID: {lock.id}</span>
                    </div>
                    <div className={styles.style15}>
                      Locked by: {lock.owner?.name || 'Unknown'} at {new Date(lock.locked_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Push Section */}
          <div className={styles.style2}>
            <h3 className={styles.style3}>Push LFS Assets</h3>
            <p className={styles.style4}>Manually push LFS objects for a specific remote and branch.</p>
            
            <form onSubmit={handlePush} className={styles.style5}>
              <select
                value={selectedRemote}
                onChange={(e) => setSelectedRemote(e.target.value)}
                disabled={isActionLoading || remotes.length === 0}
                className={styles.style6}
              >
                {remotes.length === 0 && <option value="">No remotes</option>}
                {remotes.map((r) => (
                  <option key={r.name} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Branch (e.g. main)"
                value={pushBranch}
                onChange={(e) => setPushBranch(e.target.value)}
                disabled={isActionLoading}
                className={styles.style6}
              />
              <button
                type="submit"
                className="btn btn--primary"
                disabled={isActionLoading || remotes.length === 0 || !pushBranch.trim()}
              >
                {isActionLoading ? 'Pushing...' : 'Push'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
