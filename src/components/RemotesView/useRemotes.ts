import { useEffect, useState, useCallback } from 'react';
import {
  listRemotes,
  addRemote,
  deleteRemote,
  fetchRemote,
  pushRemote,
  pullRemote,
  listBranches,
  setRemoteUrl,
  RemoteInfo,
  BranchInfo
} from '../../api/git';
import { useAppStore } from '../../store';

export function useRemotes() {
  const [remotes, setRemotes] = useState<RemoteInfo[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [activeBranch, setActiveBranch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add Remote Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRemoteName, setNewRemoteName] = useState('');
  const [newRemoteUrl, setNewRemoteUrl] = useState('');

  // Edit Remote Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRemoteName, setEditRemoteName] = useState('');
  const [editRemoteUrl, setEditRemoteUrl] = useState('');

  // Pull / Push state
  const [activeRemote, setActiveRemote] = useState<RemoteInfo | null>(null);
  const [syncType, setSyncType] = useState<'pull' | 'push' | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [customBranch, setCustomBranch] = useState<string>('');
  const [useCustomBranch, setUseCustomBranch] = useState<boolean>(false);
  const [forcePush, setForcePush] = useState<boolean>(false);

  // Output Dialog
  const [gitOutput, setGitOutput] = useState<string>('');
  const [gitOutputTitle, setGitOutputTitle] = useState<string>('');
  const [showOutputModal, setShowOutputModal] = useState<boolean>(false);

  const { autoRefreshInterval, addToast } = useAppStore();

  const loadData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) {
        setLoading(true);
      }
      const rems = await listRemotes();
      setRemotes(rems);

      const brs = await listBranches();
      setBranches(brs);

      const headBranch = brs.find((b) => b.is_head);
      if (headBranch) {
        setActiveBranch(headBranch.shorthand);
        if (!isBackground) {
          setSelectedBranch(headBranch.shorthand);
        }
      } else if (brs.length > 0) {
        setActiveBranch(brs[0].shorthand);
        if (!isBackground) {
          setSelectedBranch(brs[0].shorthand);
        }
      }
      setError(null);
    } catch (err) {
      const errMsg = String(err);
      setError(errMsg);
      if (!isBackground) {
        addToast(`Failed to load remotes data: ${errMsg}`, 'error');
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  }, [addToast]);

  useEffect(() => {
    loadData(false);

    if (autoRefreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      loadData(true);
    }, autoRefreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefreshInterval, loadData]);

  const handleAddRemote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemoteName.trim() || !newRemoteUrl.trim()) {
      addToast('Name and URL are required', 'error');
      return;
    }

    try {
      setActionLoading('add');
      await addRemote(newRemoteName.trim(), newRemoteUrl.trim());
      addToast(`Remote "${newRemoteName}" added successfully`, 'success');
      setNewRemoteName('');
      setNewRemoteUrl('');
      setShowAddModal(false);
      loadData();
    } catch (err) {
      addToast(`Failed to add remote: ${String(err)}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditRemote = (remote: RemoteInfo) => {
    setEditRemoteName(remote.name);
    setEditRemoteUrl(remote.url || '');
    setShowEditModal(true);
  };

  const handleEditRemoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRemoteUrl.trim()) {
      addToast('URL is required', 'error');
      return;
    }

    try {
      setActionLoading(`edit-${editRemoteName}`);
      await setRemoteUrl(editRemoteName, editRemoteUrl.trim());
      addToast(`Remote "${editRemoteName}" URL updated successfully`, 'success');
      setShowEditModal(false);
      loadData();
    } catch (err) {
      addToast(`Failed to edit remote: ${String(err)}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteRemote = async (name: string) => {
    if (!window.confirm(`Are you sure you want to delete remote "${name}"?`)) {
      return;
    }

    try {
      setActionLoading(`delete-${name}`);
      await deleteRemote(name);
      addToast(`Deleted remote "${name}"`, 'success');
      loadData();
    } catch (err) {
      addToast(`Failed to delete remote: ${String(err)}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFetchRemote = async (name: string) => {
    try {
      setActionLoading(`fetch-${name}`);
      addToast(`Fetching from "${name}"...`, 'info');
      const output = await fetchRemote(name);
      setGitOutputTitle(`Fetch from "${name}"`);
      setGitOutput(output || 'Fetch completed successfully with no output.');
      setShowOutputModal(true);
      addToast(`Fetch from "${name}" completed`, 'success');
    } catch (err) {
      setGitOutputTitle(`Fetch from "${name}" Failed`);
      setGitOutput(String(err));
      setShowOutputModal(true);
      addToast(`Failed to fetch from "${name}"`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRemote || !syncType) return;

    const branch = useCustomBranch ? customBranch.trim() : selectedBranch.trim();
    if (!branch) {
      addToast('Branch name is required', 'error');
      return;
    }

    const remoteName = activeRemote.name;
    const actionKey = `${syncType}-${remoteName}`;

    if (syncType === 'push' && forcePush) {
      if (!window.confirm(`WARNING: You are about to FORCE PUSH branch "${branch}" to remote "${remoteName}".\nThis will overwrite the remote repository commit history. Are you sure you want to proceed?`)) {
        return;
      }
    }

    // Close options modal before starting long process
    setActiveRemote(null);
    setSyncType(null);

    try {
      setActionLoading(actionKey);
      if (syncType === 'pull') {
        addToast(`Pulling ${branch} from "${remoteName}"...`, 'info');
        const output = await pullRemote(remoteName, branch);
        setGitOutputTitle(`Pull ${branch} from ${remoteName}`);
        setGitOutput(output || 'Pull completed successfully.');
        setShowOutputModal(true);
        addToast(`Successfully pulled from "${remoteName}"`, 'success');
      } else {
        addToast(`Pushing ${branch} to "${remoteName}"...`, 'info');
        const output = await pushRemote(remoteName, branch, forcePush);
        setGitOutputTitle(`Push ${branch} to ${remoteName}`);
        setGitOutput(output || 'Push completed successfully.');
        setShowOutputModal(true);
        addToast(`Successfully pushed to "${remoteName}"`, 'success');
      }
    } catch (err) {
      setGitOutputTitle(`${syncType === 'pull' ? 'Pull' : 'Push'} Failed`);
      setGitOutput(String(err));
      setShowOutputModal(true);
      addToast(`Failed to ${syncType} to/from "${remoteName}"`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openSyncModal = (remote: RemoteInfo, type: 'pull' | 'push') => {
    setActiveRemote(remote);
    setSyncType(type);
    setUseCustomBranch(false);
    setCustomBranch('');
    setForcePush(false);
    setSelectedBranch(activeBranch || 'master');
  };
  return {
    remotes,
    setRemotes,
    branches,
    setBranches,
    activeBranch,
    setActiveBranch,
    loading,
    setLoading,
    actionLoading,
    setActionLoading,
    error,
    setError,
    showAddModal,
    setShowAddModal,
    newRemoteName,
    setNewRemoteName,
    newRemoteUrl,
    setNewRemoteUrl,
    showEditModal,
    setShowEditModal,
    editRemoteName,
    setEditRemoteName,
    editRemoteUrl,
    setEditRemoteUrl,
    activeRemote,
    setActiveRemote,
    syncType,
    setSyncType,
    selectedBranch,
    setSelectedBranch,
    customBranch,
    setCustomBranch,
    useCustomBranch,
    setUseCustomBranch,
    forcePush,
    setForcePush,
    gitOutput,
    setGitOutput,
    gitOutputTitle,
    setGitOutputTitle,
    showOutputModal,
    setShowOutputModal,
    loadData,
    handleAddRemote,
    handleEditRemote,
    handleEditRemoteSubmit,
    handleDeleteRemote,
    handleFetchRemote,
    handleSyncSubmit,
    openSyncModal
  };
}
