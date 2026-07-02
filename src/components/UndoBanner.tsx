import { useEffect, useState, useCallback } from 'react';
import { runGitCommand, getStatus } from '../api/git';
import { useAppStore } from '../store';

import styles from "./UndoBanner.module.css";

interface ReflogEntry {
  hash: string;
  selector: string;
  action: string;
  details: string;
}

export function UndoBanner() {
  const [lastEntry, setLastEntry] = useState<ReflogEntry | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  const { repositoryPath, addToast, setCurrentView } = useAppStore();

  const fetchReflog = useCallback(async () => {
    if (!repositoryPath) return;
    try {
      const output = await runGitCommand(['reflog', '-n', '2', '--date=relative']);
      const lines = output.trim().split('\n').filter(Boolean);
      if (lines.length > 0) {
        // Example line:
        // edfc73c HEAD@{0}: commit: Implement Floating Command Palette (Ctrl+K)
        const line = lines[0];
        const match = line.match(/^([a-f0-9]+)\s+(HEAD@\{[^\}]+\}):\s+([^:]+):\s*(.*)$/);
        if (match) {
          const entry: ReflogEntry = {
            hash: match[1],
            selector: match[2],
            action: match[3].trim(),
            details: match[4].trim()
          };

          // We only offer undo if the action is a commit, checkout, merge, reset, rebase, or cherry-pick
          const undoableActions = ['commit', 'commit (amend)', 'checkout', 'merge', 'cherry-pick', 'revert', 'reset'];
          const isUndoable = undoableActions.some(act => entry.action.toLowerCase().includes(act));

          if (isUndoable) {
            // Check if this is a new action compared to what we stored
            if (lastEntry && lastEntry.hash !== entry.hash) {
              // Show banner only if the hash changed
              setShowBanner(true);
              // Auto hide after 12 seconds
              const timer = setTimeout(() => {
                setShowBanner(false);
              }, 12000);
              return () => clearTimeout(timer);
            }
            setLastEntry(entry);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching reflog', err);
    }
  }, [repositoryPath, lastEntry]);

  useEffect(() => {
    fetchReflog();
    // Poll reflog periodically to notice backend updates
    const interval = setInterval(fetchReflog, 5000);
    return () => clearInterval(interval);
  }, [fetchReflog]);

  const handleUndo = async () => {
    if (!lastEntry) return;
    setIsUndoing(true);
    try {
      const action = lastEntry.action.toLowerCase();
      let undoMsg = '';

      if (action.includes('commit')) {
        // Soft reset to keep the changes in the working tree/staged
        await runGitCommand(['reset', '--soft', 'HEAD@{1}']);
        undoMsg = 'Commit undone. Changes preserved in working tree.';
      } else if (action.includes('checkout')) {
        // Extract branch we moved from: e.g. "moving from develop to main"
        // Let's parse details
        const moveMatch = lastEntry.details.match(/moving\s+from\s+(\S+)\s+to\s+(\S+)/);
        if (moveMatch && moveMatch[1]) {
          const prevBranch = moveMatch[1];
          await runGitCommand(['checkout', prevBranch]);
          undoMsg = `Checked out previous branch: ${prevBranch}`;
        } else {
          // Fallback to checking out the HEAD@{1} hash
          await runGitCommand(['checkout', 'HEAD@{1}']);
          undoMsg = 'Switched back to previous HEAD state.';
        }
      } else if (action.includes('merge') || action.includes('cherry-pick') || action.includes('revert') || action.includes('reset')) {
        // Safe hard reset to previous commit
        await runGitCommand(['reset', '--hard', 'HEAD@{1}']);
        undoMsg = `Undid ${lastEntry.action} operation successfully.`;
      } else {
        await runGitCommand(['reset', '--keep', 'HEAD@{1}']);
        undoMsg = `Undid last action (${lastEntry.action}).`;
      }

      addToast(undoMsg, 'success');
      setShowBanner(false);
      
      // Update app views/status
      await getStatus().catch(() => {});
      // Trigger a view refresh if in working tree
      setCurrentView('WORKING_TREE');
    } catch (err) {
      addToast(`Undo failed: ${String(err)}`, 'error');
    } finally {
      setIsUndoing(false);
    }
  };

  if (!showBanner || !lastEntry) return null;

  // Human friendly label
  let friendlyLabel = lastEntry.action;
  if (friendlyLabel.includes('commit')) friendlyLabel = 'Commit';
  else if (friendlyLabel.includes('checkout')) friendlyLabel = 'Checkout';
  else if (friendlyLabel.includes('merge')) friendlyLabel = 'Merge';
  else if (friendlyLabel.includes('reset')) friendlyLabel = 'Reset';

  return (
    <div className="undo-banner">
      <div className={styles.style2}>
        <span className={styles.style3}>
          Git Operation Detected
        </span>
        <span className={styles.style4}>
          Undoes last: <strong>{friendlyLabel}</strong> ({lastEntry.details.substring(0, 30)})
        </span>
      </div>
      <div className={styles.style5}>
        <button className="btn btn--primary" onClick={handleUndo} disabled={isUndoing}>
          {isUndoing ? 'Undoing...' : 'Undo'}
        </button>
        <button
          className="btn btn--secondary"
          onClick={() => setShowBanner(false)}
          disabled={isUndoing}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
