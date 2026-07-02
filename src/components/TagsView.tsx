import React, { useEffect, useState, useCallback } from 'react';
import { listTags, createTag, deleteTag, pushTag, checkoutTag, listRemotes, TagInfo, RemoteInfo } from '../api/git';
import { useAppStore } from '../store';

import styles from "./TagsView.module.css";

export function TagsView() {
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tagName, setTagName] = useState('');
  const [targetCommit, setTargetCommit] = useState('');
  const [tagMessage, setTagMessage] = useState('');
  
  // Push tag modal state
  const [remotes, setRemotes] = useState<RemoteInfo[]>([]);
  const [showPushModal, setShowPushModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedRemote, setSelectedRemote] = useState('');
  const [isPushing, setIsPushing] = useState(false);

  const { autoRefreshInterval, addToast } = useAppStore();

  const fetchTags = useCallback(async (isBackground = false) => {
    try {
      const result = await listTags();
      setTags(result);
      setError(null);
    } catch (err) {
      const errMsg = String(err);
      setError(errMsg);
      if (!isBackground) {
        addToast(`Failed to load tags: ${errMsg}`, 'error');
      }
    }
  }, [addToast]);

  useEffect(() => {
    fetchTags(false);

    if (autoRefreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchTags(true);
    }, autoRefreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefreshInterval, fetchTags]);

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) {
      addToast('Tag name cannot be empty', 'error');
      return;
    }
    const target = targetCommit.trim() || 'HEAD';

    try {
      await createTag(tagName.trim(), target, tagMessage.trim() || undefined);
      addToast(`Tag ${tagName} created successfully`, 'success');
      setTagName('');
      setTargetCommit('');
      setTagMessage('');
      setShowCreateModal(false);
      fetchTags();
    } catch (err) {
      addToast(`Failed to create tag: ${String(err)}`, 'error');
    }
  };

  const handleDelete = async (shorthand: string) => {
    if (!window.confirm(`Are you sure you want to delete tag "${shorthand}"?`)) {
      return;
    }
    try {
      await deleteTag(shorthand);
      addToast(`Deleted tag ${shorthand}`, 'success');
      fetchTags();
    } catch (err) {
      addToast(`Failed to delete tag: ${String(err)}`, 'error');
    }
  };

  const handleCheckout = async (shorthand: string) => {
    try {
      await checkoutTag(shorthand);
      addToast(`Checked out tag ${shorthand} (Detached HEAD)`, 'success');
    } catch (err) {
      addToast(`Failed to checkout tag: ${String(err)}`, 'error');
    }
  };

  const handleOpenPushModal = async (tagShorthand: string) => {
    setSelectedTag(tagShorthand);
    try {
      const remoteList = await listRemotes();
      setRemotes(remoteList);
      if (remoteList.length > 0) {
        setSelectedRemote(remoteList[0].name);
      } else {
        setSelectedRemote('');
      }
      setShowPushModal(true);
    } catch (err) {
      addToast(`Failed to load remotes: ${String(err)}`, 'error');
    }
  };

  const handlePushTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTag || !selectedRemote) {
      addToast('Please select a remote', 'error');
      return;
    }
    setIsPushing(true);
    try {
      const output = await pushTag(selectedRemote, selectedTag);
      addToast(`Tag "${selectedTag}" pushed to remote "${selectedRemote}" successfully.\n${output}`, 'success');
      setShowPushModal(false);
      setSelectedTag(null);
    } catch (err) {
      addToast(`Failed to push tag: ${String(err)}`, 'error');
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="branches-view"> {/* Reuses layout container rules */}
      <div className="branches-view__header">
        <h2 className="branches-view__title">Tags</h2>
        <div className="branches-view__actions">
          <button
            className="btn btn--primary"
            onClick={() => setShowCreateModal(true)}
          >
            Create Tag
          </button>
        </div>
      </div>
      <div className="branches-view__content">
        {error && <p className={styles.style2}>Error: {error}</p>}

        <div className="branch-list">
          {tags.length === 0 ? (
            <p className={styles.style4}>
              No tags found in this repository.
            </p>
          ) : (
            tags.map((tag) => (
              <div key={tag.name} className="branch-item">
                <div className="branch-item__details">
                  <div className={styles.style7}>
                    <span className="branch-item__name">
                      {tag.shorthand}
                    </span>
                    {tag.message && (
                      <span className="badge badge--staged">Annotated</span>
                    )}
                  </div>
                  <span className={styles.style10}>
                    Commit: {tag.id.substring(0, 8)}
                  </span>
                  {tag.message && (
                    <span className={styles.style11}>
                      "{tag.message.trim()}"
                    </span>
                  )}
                </div>
                <div className="branch-item__actions">
                  <button
                    className="btn btn--secondary"
                    onClick={() => handleCheckout(tag.shorthand)}>
                    Checkout
                  </button>
                  <button
                    className="btn btn--primary"
                    onClick={() => handleOpenPushModal(tag.shorthand)}>
                    Push
                  </button>
                  <button className="btn btn--danger" onClick={() => handleDelete(tag.shorthand)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Create Tag</span>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateTag} className={styles.style17}>
              <div className={styles.style18}>
                <label className={styles.style19}>Tag Name</label>
                <input
                  type="text"
                  placeholder="e.g. v1.0.0"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  autoFocus
                  className={styles.style20}
                />
              </div>
              <div className={styles.style21}>
                <label className={styles.style22}>Target Commit SHA / Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="Defaults to HEAD"
                  value={targetCommit}
                  onChange={(e) => setTargetCommit(e.target.value)}
                  className={styles.style23}
                />
              </div>
              <div className={styles.style24}>
                <label className={styles.style25}>Message (Optional - Creates Annotated Tag)</label>
                <textarea
                  placeholder="Leave empty for a lightweight tag..."
                  value={tagMessage}
                  onChange={(e) => setTagMessage(e.target.value)}
                  className={styles.style26}
                />
              </div>
              <div className={styles.style27}>
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
      {showPushModal && (
        <div className="modal-overlay" onClick={() => { if (!isPushing) { setShowPushModal(false); setSelectedTag(null); } }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Push Tag to Remote</span>
              <button className="modal-close" onClick={() => { if (!isPushing) { setShowPushModal(false); setSelectedTag(null); } }} disabled={isPushing}>
                &times;
              </button>
            </div>
            <form onSubmit={handlePushTag} className={styles.style30}>
              <div className={styles.style31}>
                <label className={styles.style32}>
                  Remote Target (Pushing tag "{selectedTag}")
                </label>
                {remotes.length === 0 ? (
                  <p className={styles.style33}>No remotes configured. Add a remote first.</p>
                ) : (
                  <select
                    value={selectedRemote}
                    onChange={(e) => setSelectedRemote(e.target.value)}
                    disabled={isPushing}
                    className={styles.style34}
                  >
                    {remotes.map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.name} ({r.url || 'No URL'})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className={styles.style35}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => { setShowPushModal(false); setSelectedTag(null); }}
                  disabled={isPushing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={isPushing || remotes.length === 0}
                >
                  {isPushing ? 'Pushing...' : 'Push Tag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
