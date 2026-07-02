import { useEffect, useState } from 'react';
import { getRebaseCommits, performInteractiveRebase, RebaseCommit } from '../api/git';
import { useAppStore } from '../store';

import styles from "./InteractiveRebaseModal.module.css";

interface InteractiveRebaseModalProps {
  baseCommitId: string;
  baseCommitMessage: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function InteractiveRebaseModal({
  baseCommitId,
  baseCommitMessage,
  onClose,
  onSuccess,
}: InteractiveRebaseModalProps) {
  const [commits, setCommits] = useState<RebaseCommit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const { addToast } = useAppStore();

  useEffect(() => {
    async function loadCommits() {
      setIsLoading(true);
      setError(null);
      try {
        const list = await getRebaseCommits(baseCommitId);
        setCommits(list);
      } catch (err) {
        setError(String(err));
      } finally {
        setIsLoading(false);
      }
    }
    loadCommits();
  }, [baseCommitId]);

  const updateCommitAction = (index: number, action: string) => {
    const updated = [...commits];
    updated[index].action = action;
    setCommits(updated);
  };

  // Reordering functions
  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= commits.length) return;
    const updated = [...commits];
    const item = updated[fromIndex];
    updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, item);
    setCommits(updated);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...commits];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);

    setCommits(updated);
    setDraggedIndex(null);
  };

  const handleStartRebase = async () => {
    if (commits.length === 0) return;
    setIsExecuting(true);
    setError(null);
    try {
      const res = await performInteractiveRebase(baseCommitId, commits);
      if (res.success) {
        addToast('Interactive rebase completed successfully', 'success');
        onSuccess();
        onClose();
      } else if (res.status === 'conflicts') {
        addToast(res.message, 'info');
        // Pause rebase, close modal and let user resolve conflicts in working tree
        onSuccess();
        onClose();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rebase-modal-title">
        <div className="modal-header">
          <span id="rebase-modal-title" className="modal-title">Interactive Rebase</span>
          <button className="modal-close" onClick={onClose} disabled={isExecuting} aria-label="Close" title="Close">
            &times;
          </button>
        </div>

        <div className={styles.style3}>
          <p className={styles.style4}>
            Rebasing branch HEAD onto base commit:{' '}
            <code className={styles.style5}>{baseCommitId.substring(0, 8)}</code> (
            <span className={styles.style6}>{baseCommitMessage}</span>)
          </p>
          <p className={styles.style7}>
            Drag-and-drop items or use arrow keys to reorder. Change action to squash, fixup, edit, or drop.
          </p>
        </div>

        <div className={styles.style8}>
          {isLoading ? (
            <div className={styles.style9}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={styles.style10}
                />
              ))}
            </div>
          ) : error ? (
            <div
              className={styles.style11}
            >
              <strong>Rebase Error:</strong> {error}
            </div>
          ) : commits.length === 0 ? (
            <div className={styles.style12}>
              No commits to rebase. HEAD is already at the target commit.
            </div>
          ) : (
            <div className={styles.style13}>
              {commits.map((commit, index) => {
                const isFirst = index === 0;
                const isLast = index === commits.length - 1;
                return (
                  <div
                    key={commit.id}
                    draggable={!isExecuting}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--spacing-2) var(--spacing-3)',
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--border-radius)',
                      cursor: isExecuting ? 'not-allowed' : 'grab',
                      opacity: commit.action === 'drop' ? 0.5 : 1,
                    }}
                  >
                    <div className={styles.style14}>
                      {/* Drag handle icon indicator */}
                      <span className={styles.style15}>
                        ☰
                      </span>
                      
                      {/* Action selector */}
                      <select
                        value={commit.action}
                        onChange={(e) => updateCommitAction(index, e.target.value)}
                        disabled={isExecuting}
                        className={styles.style16}
                      >
                        <option value="pick">Pick</option>
                        <option value="squash">Squash</option>
                        <option value="fixup">Fixup</option>
                        <option value="edit">Edit</option>
                        <option value="drop">Drop</option>
                      </select>

                      {/* Commit details */}
                      <div className={styles.style17}>
                        <span
                          className={styles.style18}
                        >
                          {commit.message}
                        </span>
                        <span className={styles.style19}>
                          <code className={styles.style20}>{commit.id.substring(0, 8)}</code> by{' '}
                          {commit.author}
                        </span>
                      </div>
                    </div>
                    {/* Move controls */}
                    <div className={styles.style21}>
                      <button
                        className="btn btn--secondary"
                        disabled={isFirst || isExecuting}
                        onClick={() => moveItem(index, index - 1)}
                        title="Move Up">
                        ▲
                      </button>
                      <button
                        className="btn btn--secondary"
                        disabled={isLast || isExecuting}
                        onClick={() => moveItem(index, index + 1)}
                        title="Move Down">
                        ▼
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          className={styles.style24}
        >
          <button className="btn btn--secondary" onClick={onClose} disabled={isExecuting}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            onClick={handleStartRebase}
            disabled={isExecuting || isLoading || commits.length === 0}
          >
            {isExecuting ? 'Rebasing...' : 'Start Rebase'}
          </button>
        </div>
      </div>
    </div>
  );
}
