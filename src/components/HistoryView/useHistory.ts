import { useEffect, useState, useRef, useCallback } from 'react';
import { getHistory, getCommitDetails, CommitInfo, CommitDetails, cherryPick, revertCommit, listBranches, listTags, BranchInfo, TagInfo } from '../../api/git';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAppStore } from '../../store';
import { computeDag, DagNode } from './historyUtils';

import { useCIStatuses } from './useCIStatuses';

export function useHistory() {
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [dagMap, setDagMap] = useState<Map<string, DagNode>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [selectedCommitId, setSelectedCommitId] = useState<string | null>(null);
  const [commitDetails, setCommitDetails] = useState<CommitDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [viewingDiffFile, setViewingDiffFile] = useState<{ path: string; commitId: string } | null>(null);
  const [showRebaseModal, setShowRebaseModal] = useState(false);
  const [modalViewMode, setModalViewMode] = useState<'diff' | 'blame'>('diff');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: Array<{ label: string; action: () => void; danger?: boolean; disabled?: boolean }> } | null>(null);
  const [refsMap, setRefsMap] = useState<Map<string, { shorthand: string; isHead: boolean; isTag: boolean }[]>>(new Map());
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);

  // Filters State
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterAuthor, setFilterAuthor] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterPath, setFilterPath] = useState('');
  const [filterPathActive, setFilterPathActive] = useState('');
  const [filterContent, setFilterContent] = useState('');
  const [filterContentActive, setFilterContentActive] = useState('');

  const parentRef = useRef<HTMLDivElement>(null);
  const { ciStatuses, fetchCIStatuses } = useCIStatuses();
  const { autoRefreshInterval, addToast, historyFileFilter, setHistoryFileFilter } = useAppStore();

  useEffect(() => {
    if (historyFileFilter !== null) {
      setFilterPath(historyFileFilter);
      setFilterPathActive(historyFileFilter);
      setHistoryFileFilter(null);
    }
  }, [historyFileFilter, setHistoryFileFilter]);

  const fetchHistory = useCallback(async (isBackground = false, activePath = filterPathActive, activeContent = filterContentActive) => {
    try {
      const result = await getHistory(1000, activePath || undefined, activeContent || undefined);
      
      setCommits((prev) => {
        if (prev.length === result.length && prev[0]?.id === result[0]?.id && prev[prev.length - 1]?.id === result[result.length - 1]?.id) {
          return prev; // Optimization: skip re-rendering if commits haven't changed
        }
        return result;
      });
      setError(null);
      fetchCIStatuses(result);

      const branchList = await listBranches().catch(() => [] as BranchInfo[]);
      const tagList = await listTags().catch(() => [] as TagInfo[]);
      const newRefsMap = new Map<string, { shorthand: string; isHead: boolean; isTag: boolean }[]>();

      branchList.forEach((b) => {
        if (b.target_commit) {
          const list = newRefsMap.get(b.target_commit) || [];
          list.push({ shorthand: b.shorthand, isHead: b.is_head, isTag: false });
          newRefsMap.set(b.target_commit, list);
        }
      });

      tagList.forEach((t) => {
        if (t.id) {
          const list = newRefsMap.get(t.id) || [];
          list.push({ shorthand: t.shorthand, isHead: false, isTag: true });
          newRefsMap.set(t.id, list);
        }
      });

      setRefsMap((prev) => {
        // Quick stringified comparison to avoid unnecessary re-renders
        const prevStr = JSON.stringify(Array.from(prev.entries()));
        const newStr = JSON.stringify(Array.from(newRefsMap.entries()));
        if (prevStr === newStr) return prev;
        return newRefsMap;
      });
    } catch (err) {
      const errMsg = String(err);
      setError(errMsg);
      if (!isBackground) {
        addToast(`Failed to load history: ${errMsg}`, 'error');
      }
    }
  }, [fetchCIStatuses, addToast, filterPathActive, filterContentActive]);

  useEffect(() => {
    fetchHistory(false, filterPathActive, filterContentActive);

    if (autoRefreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchHistory(true, filterPathActive, filterContentActive);
    }, autoRefreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoRefreshInterval, filterPathActive, filterContentActive, fetchHistory]);

  useEffect(() => {
    setDagMap(computeDag(commits));
  }, [commits]);

  useEffect(() => {
    if (!selectedCommitId) {
      setCommitDetails(null);
      return;
    }

    const commitId = selectedCommitId;
    let active = true;
    async function fetchDetails() {
      setLoadingDetails(true);
      try {
        const details = await getCommitDetails(commitId);
        if (active) {
          setCommitDetails(details);
        }
      } catch (err) {
        if (active) {
          addToast(`Failed to load commit details: ${String(err)}`, 'error');
        }
      } finally {
        if (active) {
          setLoadingDetails(false);
        }
      }
    }

    fetchDetails();
    return () => {
      active = false;
    };
  }, [selectedCommitId, addToast]);

  // Client-side filtering of keyword, author, and date
  const filteredCommits = commits.filter((commit) => {
    if (filterKeyword && !commit.message.toLowerCase().includes(filterKeyword.toLowerCase())) {
      return false;
    }
    if (filterAuthor && !commit.author.toLowerCase().includes(filterAuthor.toLowerCase())) {
      return false;
    }
    if (filterDateStart) {
      const startSecs = new Date(filterDateStart).getTime() / 1000;
      if (commit.time < startSecs) return false;
    }
    if (filterDateEnd) {
      const endSecs = (new Date(filterDateEnd).getTime() + 86400000) / 1000;
      if (commit.time > endSecs) return false;
    }
    return true;
  });

  const rowVirtualizer = useVirtualizer({
    count: filteredCommits.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // height of a single row
    overscan: 10,
  });

  const handlePathFilterSubmit = () => {
    setFilterPathActive(filterPath);
  };

  const handleContentFilterSubmit = () => {
    setFilterContentActive(filterContent);
  };

  const handleCopyHash = () => {
    if (!selectedCommitId) return;
    navigator.clipboard.writeText(selectedCommitId);
    addToast('Commit hash copied to clipboard', 'success');
  };

  const handleCherryPick = async () => {
    if (!selectedCommitId) return;
    if (!window.confirm(`Are you sure you want to cherry-pick commit ${selectedCommitId.substring(0, 7)} onto the current branch?`)) {
      return;
    }
    try {
      await cherryPick(selectedCommitId);
      addToast(`Successfully cherry-picked ${selectedCommitId.substring(0, 7)}`, 'success');
      fetchHistory(false, filterPathActive);
    } catch (err) {
      addToast(`Cherry-pick failed: ${String(err)}`, 'error');
    }
  };

  const handleRevert = async () => {
    if (!selectedCommitId) return;
    if (!window.confirm(`Are you sure you want to revert commit ${selectedCommitId.substring(0, 7)}?`)) {
      return;
    }
    try {
      await revertCommit(selectedCommitId);
      addToast(`Successfully reverted ${selectedCommitId.substring(0, 7)}`, 'success');
      fetchHistory(false, filterPathActive);
    } catch (err) {
      addToast(`Revert failed: ${String(err)}`, 'error');
    }
  };

  const handleOpenFile = (path: string, commitId: string) => {
    setModalViewMode('diff');
    setViewingDiffFile({ path, commitId });
  };

  return {
    commits,
    setCommits,
    dagMap,
    setDagMap,
    error,
    setError,
    selectedCommitId,
    setSelectedCommitId,
    commitDetails,
    setCommitDetails,
    loadingDetails,
    setLoadingDetails,
    viewingDiffFile,
    setViewingDiffFile,
    showRebaseModal,
    setShowRebaseModal,
    modalViewMode,
    setModalViewMode,
    contextMenu,
    setContextMenu,
    refsMap,
    setRefsMap,
    detailsCollapsed,
    setDetailsCollapsed,
    filterKeyword,
    setFilterKeyword,
    filterAuthor,
    setFilterAuthor,
    filterDateStart,
    setFilterDateStart,
    filterDateEnd,
    setFilterDateEnd,
    filterPath,
    setFilterPath,
    filterPathActive,
    setFilterPathActive,
    filterContent,
    setFilterContent,
    filterContentActive,
    setFilterContentActive,
    ciStatuses,
    fetchCIStatuses,
    fetchHistory,
    rowVirtualizer,
    handlePathFilterSubmit,
    handleContentFilterSubmit,
    handleCopyHash,
    handleCherryPick,
    handleRevert,
    handleOpenFile,
    filteredCommits,
    parentRef
  };
}
