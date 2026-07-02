import { useEffect, useState, useCallback } from 'react';
import {
  listBranches,
  checkoutBranch,
  createBranch,
  deleteBranch,
  renameBranch,
  deleteRemoteBranch,
  BranchInfo,
  compareBranches,
  BranchComparison,
  getStatus,
  saveStash,
  popStash,
  checkMergeConflicts,
  runGitCommand
} from '../../api/git';
import { useAppStore } from '../../store';

export function useBranches() {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Create branch modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  
  // Rename branch modal
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [oldBranchName, setOldBranchName] = useState('');
  const [renameBranchName, setRenameBranchName] = useState('');

  // Branch Comparison state
  const [activeTab, setActiveTab] = useState<'list' | 'compare'>('list');
  const [baseBranch, setBaseBranch] = useState<string>('');
  const [compareBranch, setCompareBranch] = useState<string>('');
  const [comparison, setComparison] = useState<BranchComparison | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: Array<{ label: string; action: () => void; danger?: boolean; disabled?: boolean }> } | null>(null);

  // Drag and Drop Branch states
  const [dropOperation, setDropOperation] = useState<{ source: string; target: string } | null>(null);
  const [predictiveConflicts, setPredictiveConflicts] = useState<string[] | null>(null);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  useEffect(() => {
    if (!dropOperation) {
      setPredictiveConflicts(null);
      return;
    }
    const currentDrop = dropOperation;
    let active = true;
    async function checkConflicts() {
      setCheckingConflicts(true);
      try {
        const list = await checkMergeConflicts(currentDrop.target, currentDrop.source);
        if (active) {
          setPredictiveConflicts(list);
        }
      } catch {
        if (active) {
          setPredictiveConflicts([]);
        }
      } finally {
        if (active) {
          setCheckingConflicts(false);
        }
      }
    }
    checkConflicts();
    return () => {
      active = false;
    };
  }, [dropOperation]);

  const { autoRefreshInterval, addToast } = useAppStore();

  const fetchBranches = useCallback(async (isBackground = false) => {
    try {
      const result = await listBranches();
      setBranches(result);
      setError(null);
    } catch (err) {
      const errMsg = String(err);
      setError(errMsg);
      if (!isBackground) {
        addToast(`Failed to load branches: ${errMsg}`, 'error');
      }
    }
  }, [addToast]);

  useEffect(() => {
    fetchBranches(false);

    if (autoRefreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchBranches(true);
    }, autoRefreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefreshInterval, fetchBranches]);

  // Initialize dropdown selections
  useEffect(() => {
    if (branches.length > 0) {
      const head = branches.find((b) => b.is_head);
      if (head && !baseBranch) {
        setBaseBranch(head.name);
      }
      
      const other = branches.find((b) => !b.is_head && !b.is_remote);
      if (other && !compareBranch) {
        setCompareBranch(other.name);
      } else if (!compareBranch) {
        const anyOther = branches.find((b) => !b.is_head);
        if (anyOther) {
          setCompareBranch(anyOther.name);
        } else {
          setCompareBranch(branches[0].name);
        }
      }
    }
  }, [branches, baseBranch, compareBranch]);

  // Run branch comparison when parameters change
  useEffect(() => {
    let active = true;
    async function runComparison() {
      if (!baseBranch || !compareBranch) return;
      if (baseBranch === compareBranch) {
        setComparison(null);
        setComparisonError(null);
        return;
      }
      setComparisonLoading(true);
      setComparisonError(null);
      try {
        const result = await compareBranches(baseBranch, compareBranch);
        if (active) {
          setComparison(result);
        }
      } catch (err) {
        if (active) {
          setComparisonError(String(err));
          setComparison(null);
        }
      } finally {
        if (active) {
          setComparisonLoading(false);
        }
      }
    }
    
    if (activeTab === 'compare') {
      runComparison();
    }
    
    return () => {
      active = false;
    };
  }, [baseBranch, compareBranch, activeTab]);

  // Checkout prompt state
  const [showCheckoutPrompt, setShowCheckoutPrompt] = useState(false);
  const [targetCheckoutBranch, setTargetCheckoutBranch] = useState('');

  const handleCheckout = async (shorthand: string) => {
    try {
      setActionLoading(`checkout-${shorthand}`);
      const status = await getStatus();
      const hasDirty = status.unstaged.length > 0 || status.staged.length > 0 || status.untracked.length > 0;
      
      if (hasDirty) {
        setTargetCheckoutBranch(shorthand);
        setShowCheckoutPrompt(true);
        setActionLoading(null);
      } else {
        await checkoutBranch(shorthand, false);
        addToast(`Switched to branch ${shorthand}`, 'success');
        await fetchBranches(true);
        setActionLoading(null);
      }
    } catch (err) {
      addToast(`Failed to switch branch: ${String(err)}`, 'error');
      setActionLoading(null);
    }
  };

  const handleCheckoutAutoStash = async () => {
    const shorthand = targetCheckoutBranch;
    setShowCheckoutPrompt(false);
    setActionLoading(`checkout-${shorthand}`);
    try {
      addToast('Stashing uncommitted changes...', 'info');
      await saveStash(`Auto-stash before checkout to ${shorthand}`, true);
      
      addToast(`Switching to branch ${shorthand}...`, 'info');
      await checkoutBranch(shorthand, false);
      
      addToast('Restoring stashed changes...', 'info');
      await popStash(0);
      
      addToast(`Successfully switched to ${shorthand} and restored changes`, 'success');
      await fetchBranches(true);
    } catch (err) {
      addToast(`Auto-stash checkout failed: ${String(err)}`, 'error');
    } finally {
      setActionLoading(null);
      setTargetCheckoutBranch('');
    }
  };

  const handleCheckoutDiscard = async () => {
    const shorthand = targetCheckoutBranch;
    setShowCheckoutPrompt(false);
    if (!window.confirm("WARNING: Discarding changes cannot be undone. Are you sure you want to discard all changes and checkout?")) {
      setTargetCheckoutBranch('');
      return;
    }
    setActionLoading(`checkout-${shorthand}`);
    try {
      addToast('Discarding uncommitted changes and switching branch...', 'info');
      await checkoutBranch(shorthand, true);
      addToast(`Switched to branch ${shorthand} (changes discarded)`, 'success');
      await fetchBranches(true);
    } catch (err) {
      addToast(`Forced checkout failed: ${String(err)}`, 'error');
    } finally {
      setActionLoading(null);
      setTargetCheckoutBranch('');
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) {
      addToast('Branch name cannot be empty', 'error');
      return;
    }

    try {
      setActionLoading('create');
      await createBranch(newBranchName.trim());
      addToast(`Created branch ${newBranchName}`, 'success');
      setNewBranchName('');
      setShowCreateModal(false);
      await fetchBranches(true);
    } catch (err) {
      addToast(`Failed to create branch: ${String(err)}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Are you sure you want to delete branch "${name}"?`)) {
      return;
    }

    try {
      setActionLoading(`delete-${name}`);
      await deleteBranch(name);
      addToast(`Deleted branch ${name}`, 'success');
      await fetchBranches(true);
    } catch (err) {
      addToast(`Failed to delete branch: ${String(err)}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRename = (shorthand: string) => {
    setOldBranchName(shorthand);
    setRenameBranchName(shorthand);
    setShowRenameModal(true);
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = renameBranchName.trim();
    if (!cleanName || cleanName === oldBranchName) {
      setShowRenameModal(false);
      return;
    }

    try {
      setActionLoading(`rename-${oldBranchName}`);
      await renameBranch(oldBranchName, cleanName);
      addToast(`Renamed branch "${oldBranchName}" to "${cleanName}"`, 'success');
      setShowRenameModal(false);
      await fetchBranches(true);
    } catch (err) {
      addToast(`Failed to rename branch: ${String(err)}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteRemote = async (shorthand: string) => {
    const parts = shorthand.split('/');
    const remote = parts[0];
    const branchName = parts.slice(1).join('/');

    if (!window.confirm(`Are you sure you want to delete the remote branch "${branchName}" on remote "${remote}"?\n\nThis will remove it from the remote repository.`)) {
      return;
    }

    try {
      setActionLoading(`delete-remote-${shorthand}`);
      addToast(`Deleting remote branch "${branchName}"...`, 'info');
      await deleteRemoteBranch(remote, branchName);
      addToast(`Deleted remote branch "${shorthand}"`, 'success');
      await fetchBranches(true);
    } catch (err) {
      addToast(`Failed to delete remote branch: ${String(err)}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBranchDrop = (source: string, target: string) => {
    setDropOperation({ source, target });
  };

  const handleMergeBranches = async (source: string, target: string) => {
    setDropOperation(null);
    setActionLoading(`merge-${source}-into-${target}`);
    try {
      addToast(`Checking out "${target}" branch...`, 'info');
      await checkoutBranch(target, false);
      addToast(`Merging "${source}" into "${target}"...`, 'info');
      
      await runGitCommand(['merge', source]);
      addToast(`Successfully merged "${source}" into "${target}"`, 'success');
      await fetchBranches(true);
    } catch (err) {
      addToast(`Merge failed: ${String(err)}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRebaseBranches = async (source: string, target: string) => {
    setDropOperation(null);
    setActionLoading(`rebase-${target}-onto-${source}`);
    try {
      addToast(`Checking out "${target}" branch...`, 'info');
      await checkoutBranch(target, false);
      addToast(`Rebasing "${target}" onto "${source}"...`, 'info');
      
      await runGitCommand(['rebase', source]);
      addToast(`Successfully rebased "${target}" onto "${source}"`, 'success');
      await fetchBranches(true);
    } catch (err) {
      addToast(`Rebase failed: ${String(err)}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const localBranches = branches.filter((b) => !b.is_remote);
  const remoteBranches = branches.filter((b) => b.is_remote);

  return {
    branches,
    localBranches,
    remoteBranches,
    setBranches,
    error,
    setError,
    actionLoading,
    setActionLoading,
    showCreateModal,
    setShowCreateModal,
    newBranchName,
    setNewBranchName,
    showRenameModal,
    setShowRenameModal,
    oldBranchName,
    setOldBranchName,
    renameBranchName,
    setRenameBranchName,
    activeTab,
    setActiveTab,
    baseBranch,
    setBaseBranch,
    compareBranch,
    setCompareBranch,
    comparison,
    setComparison,
    comparisonLoading,
    setComparisonLoading,
    comparisonError,
    setComparisonError,
    contextMenu,
    setContextMenu,
    dropOperation,
    setDropOperation,
    predictiveConflicts,
    setPredictiveConflicts,
    checkingConflicts,
    setCheckingConflicts,
    fetchBranches,
    showCheckoutPrompt,
    setShowCheckoutPrompt,
    targetCheckoutBranch,
    setTargetCheckoutBranch,
    handleCheckout,
    handleCheckoutAutoStash,
    handleCheckoutDiscard,
    handleCreateBranch,
    handleDelete,
    handleRename,
    handleRenameSubmit,
    handleDeleteRemote,
    handleBranchDrop,
    handleMergeBranches,
    handleRebaseBranches
  };
}
