import { useState, useEffect, useCallback } from 'react';
import {
  getStatus,
  stageFile,
  unstageFile,
  discardFileChanges,
  stageAllFiles,
  unstageAllFiles,
  WorkingTreeStatus,
  getCommitTemplate,
  createCommit,
  getHistory,
  launchExternalMerge,
  rebaseContinue,
  rebaseAbort
} from '../../api/git';
import { useAppStore } from '../../store';

export function useWorkingTree() {
  const [status, setStatus] = useState<WorkingTreeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ path: string; staged: boolean } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [commitMessage, setCommitMessage] = useState('');
  const [coAuthors, setCoAuthors] = useState('');
  const [amend, setAmend] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');

  const { autoRefreshInterval, addToast } = useAppStore();

  const [hasNewUpdates, setHasNewUpdates] = useState(false);

  const fetchStatus = useCallback(async (isBackground = false) => {
    try {
      const result = await getStatus();
      if (isBackground) {
        setStatus((prevStatus) => {
          if (!prevStatus) return result;
          // Simple comparison: check lengths and rebase state
          const isDifferent =
            prevStatus.staged.length !== result.staged.length ||
            prevStatus.unstaged.length !== result.unstaged.length ||
            prevStatus.untracked.length !== result.untracked.length ||
            prevStatus.rebase_in_progress !== result.rebase_in_progress;
          
          if (isDifferent) {
            setHasNewUpdates(true);
            return prevStatus; // Don't re-render immediately
          }
          return result;
        });
      } else {
        setStatus(result);
        setHasNewUpdates(false);
        setError(null);
      }
    } catch (err) {
      const errMsg = String(err);
      if (!isBackground) {
        setError(errMsg);
        addToast(`Failed to load working tree status: ${errMsg}`, 'error');
      }
    }
  }, [addToast]);

  useEffect(() => {
    fetchStatus(false);
    if (autoRefreshInterval <= 0) return;
    const intervalId = setInterval(() => fetchStatus(true), autoRefreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefreshInterval, fetchStatus]);

  const applyUpdates = () => {
    fetchStatus(false);
  };

  const handleStage = async (path: string) => {
    try {
      setActionLoading(`stage-${path}`);
      await stageFile(path);
      addToast(`Staged ${path.split('/').pop()}`, 'success');
      if (selectedFile?.path === path) setSelectedFile({ path, staged: true });
      await fetchStatus(true);
    } catch (err) {
      addToast(`Failed to stage file: ${String(err)}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnstage = async (path: string) => {
    try {
      setActionLoading(`unstage-${path}`);
      await unstageFile(path);
      addToast(`Unstaged ${path.split('/').pop()}`, 'success');
      if (selectedFile?.path === path) setSelectedFile({ path, staged: false });
      await fetchStatus(true);
    } catch (err) {
      addToast(`Failed to unstage file: ${String(err)}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDiscard = async (path: string) => {
    const fileName = path.split('/').pop();
    if (!window.confirm(`Are you sure you want to discard all changes in "${fileName}"? This action cannot be undone.`)) return;
    try {
      setActionLoading(`discard-${path}`);
      await discardFileChanges(path);
      addToast(`Discarded changes in ${fileName}`, 'success');
      if (selectedFile?.path === path) setSelectedFile(null);
      await fetchStatus(true);
    } catch (err) {
      addToast(`Failed to discard changes: ${String(err)}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStageAll = async () => {
    try {
      setActionLoading('stage-all');
      await stageAllFiles();
      addToast('Staged all changes', 'success');
      if (selectedFile) setSelectedFile({ path: selectedFile.path, staged: true });
      await fetchStatus(true);
    } catch (err) {
      addToast(`Failed to stage all files: ${String(err)}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnstageAll = async () => {
    try {
      setActionLoading('unstage-all');
      await unstageAllFiles();
      addToast('Unstaged all changes', 'success');
      if (selectedFile) setSelectedFile({ path: selectedFile.path, staged: false });
      await fetchStatus(true);
    } catch (err) {
      addToast(`Failed to unstage all files: ${String(err)}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLaunchMerge = async (path: string) => {
    try {
      setActionLoading(`merge-${path}`);
      await launchExternalMerge(path);
      addToast(`Launched external merge tool for ${path.split('/').pop()}`, 'info');
    } catch (err) {
      addToast(`Failed to launch external merge tool: ${String(err)}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    async function loadTemplate() {
      try {
        const template = await getCommitTemplate();
        if (template) {
          setCommitMessage(prev => prev ? prev : template);
        }
      } catch (err) {
        console.error('Failed to load commit template:', err);
      }
    }
    loadTemplate();
  }, []);

  const handleAmendChange = async (checked: boolean) => {
    setAmend(checked);
    if (checked) {
      setBackupMessage(commitMessage);
      try {
        const history = await getHistory(1);
        if (history && history.length > 0) setCommitMessage(history[0].message);
      } catch (err) {
        addToast(`Failed to get last commit message: ${String(err)}`, 'error');
      }
    } else {
      setCommitMessage(backupMessage);
    }
  };

  const handleCommitSubmit = async (e?: { preventDefault: () => void }) => {
    if (e) e.preventDefault();
    if (!commitMessage.trim()) {
      addToast('Commit message cannot be empty', 'error');
      return;
    }
    setIsCommitting(true);
    try {
      let finalMessage = commitMessage.trim();
      if (coAuthors.trim()) {
        const authors = coAuthors.split(',')
          .map(a => a.trim())
          .filter(a => a.includes('<') && a.includes('>'));
        if (authors.length > 0) {
          finalMessage += '\n\n' + authors.map(a => `Co-authored-by: ${a}`).join('\n');
        }
      }
      await createCommit(finalMessage, amend);
      addToast(amend ? 'Commit amended successfully' : 'Committed successfully', 'success');
      setCommitMessage('');
      setCoAuthors('');
      setAmend(false);
      await fetchStatus(true);
    } catch (err) {
      addToast(`Failed to commit: ${String(err)}`, 'error');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleRebaseContinue = async () => {
    setActionLoading('rebase-continue');
    try {
      const res = await rebaseContinue();
      if (res.success) addToast('Rebase completed successfully', 'success');
      else if (res.status === 'conflicts') addToast(res.message, 'info');
      else addToast(`Rebase failed: ${res.message}`, 'error');
      await fetchStatus();
    } catch (err) {
      addToast(`Failed to continue rebase: ${String(err)}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRebaseAbort = async () => {
    if (!window.confirm('Are you sure you want to abort the current rebase? All rebased changes will be rolled back.')) return;
    setActionLoading('rebase-abort');
    try {
      await rebaseAbort();
      addToast('Rebase aborted successfully', 'success');
      await fetchStatus();
    } catch (err) {
      addToast(`Failed to abort rebase: ${String(err)}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return {
    status, error, selectedFile, setSelectedFile, actionLoading,
    commitMessage, setCommitMessage, coAuthors, setCoAuthors, amend, handleAmendChange, isCommitting,
    handleStage, handleUnstage, handleDiscard, handleStageAll, handleUnstageAll,
    handleLaunchMerge, handleCommitSubmit, handleRebaseContinue, handleRebaseAbort, fetchStatus,
    hasNewUpdates, applyUpdates
  };
}
