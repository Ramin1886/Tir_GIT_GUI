import "./DiffViewer.css";
import { useEffect, useState } from 'react';
import { getDiff, FileDiff, DiffLine, DiffHunk, applyCustomPatch, getParentCommitId, getFileContentAtCommit, launchExternalDiff } from '../../api/git';
import { useAppStore } from '../../store';
import { convertFileSrc } from '@tauri-apps/api/core';
import { constructCustomPatch } from './diffUtils';
import { ImageDiff } from './ImageDiff';
import { DiffContent } from './DiffContent';

import styles from "./DiffViewer.module.css";

interface DiffViewerProps {
  path: string;
  commitId?: string;
  staged?: boolean;
  onRefresh?: () => void;
}

export function DiffViewer({ path, commitId, staged = false, onRefresh }: DiffViewerProps) {
  const [diff, setDiff] = useState<FileDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'inline' | 'split'>('inline');
  const [refreshKey, setRefreshKey] = useState(0);
  const [hunkActionLoading, setHunkActionLoading] = useState<string | null>(null);
  const { addToast, repositoryPath } = useAppStore();

  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);

  const isImage = /\.(png|jpe?g|gif|webp|bmp|ico)$/i.test(path);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (diff) {
      const keys = new Set<string>();
      diff.hunks.forEach((hunk, hunkIdx) => {
        hunk.lines.forEach((line, lineIdx) => {
          if (line.origin === '+' || line.origin === '-') {
            keys.add(`${hunkIdx}-${lineIdx}`);
          }
        });
      });
      setSelectedKeys(keys);
    }
  }, [diff]);

  const getHunkSelectionState = (hunk: DiffHunk, hunkIdx: number) => {
    let modifiedCount = 0;
    let selectedCount = 0;
    hunk.lines.forEach((line, lineIdx) => {
      if (line.origin === '+' || line.origin === '-') {
        modifiedCount++;
        if (selectedKeys.has(`${hunkIdx}-${lineIdx}`)) {
          selectedCount++;
        }
      }
    });
    return {
      all: modifiedCount === selectedCount && modifiedCount > 0,
      none: selectedCount === 0,
      some: selectedCount > 0 && selectedCount < modifiedCount,
    };
  };

  const handleStageSelected = async (hunkHeader: string, lines: DiffLine[], hunkIdx: number) => {
    const selectedIndices = new Set<number>();
    lines.forEach((_, lineIdx) => {
      if (selectedKeys.has(`${hunkIdx}-${lineIdx}`)) {
        selectedIndices.add(lineIdx);
      }
    });

    if (selectedIndices.size === 0) {
      addToast('No lines selected in this hunk', 'error');
      return;
    }

    try {
      setHunkActionLoading(`stage-${hunkIdx}`);
      const patch = constructCustomPatch(path, hunkHeader, lines, selectedIndices, false);
      await applyCustomPatch(patch, ['--cached', '--unidiff-zero']);
      addToast(`Staged changes in hunk ${hunkIdx + 1}`, 'success');
      setRefreshKey((prev) => prev + 1);
      if (onRefresh) onRefresh();
    } catch (err) {
      addToast(`Failed to stage lines: ${String(err)}`, 'error');
    } finally {
      setHunkActionLoading(null);
    }
  };

  const handleUnstageSelected = async (hunkHeader: string, lines: DiffLine[], hunkIdx: number) => {
    const selectedIndices = new Set<number>();
    lines.forEach((_, lineIdx) => {
      if (selectedKeys.has(`${hunkIdx}-${lineIdx}`)) {
        selectedIndices.add(lineIdx);
      }
    });

    if (selectedIndices.size === 0) {
      addToast('No lines selected in this hunk', 'error');
      return;
    }

    try {
      setHunkActionLoading(`unstage-${hunkIdx}`);
      const patch = constructCustomPatch(path, hunkHeader, lines, selectedIndices, true);
      await applyCustomPatch(patch, ['--cached', '--reverse', '--unidiff-zero']);
      addToast(`Unstaged changes in hunk ${hunkIdx + 1}`, 'success');
      setRefreshKey((prev) => prev + 1);
      if (onRefresh) onRefresh();
    } catch (err) {
      addToast(`Failed to unstage lines: ${String(err)}`, 'error');
    } finally {
      setHunkActionLoading(null);
    }
  };

  const handleDiscardSelected = async (hunkHeader: string, lines: DiffLine[], hunkIdx: number) => {
    const selectedIndices = new Set<number>();
    lines.forEach((_, lineIdx) => {
      if (selectedKeys.has(`${hunkIdx}-${lineIdx}`)) {
        selectedIndices.add(lineIdx);
      }
    });

    if (selectedIndices.size === 0) {
      addToast('No lines selected in this hunk', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to discard selected changes in hunk ${hunkIdx + 1}? This action cannot be undone.`)) {
      return;
    }

    try {
      setHunkActionLoading(`discard-${hunkIdx}`);
      const patch = constructCustomPatch(path, hunkHeader, lines, selectedIndices, true);
      await applyCustomPatch(patch, ['--reverse', '--unidiff-zero']);
      addToast(`Discarded changes in hunk ${hunkIdx + 1}`, 'success');
      setRefreshKey((prev) => prev + 1);
      if (onRefresh) onRefresh();
    } catch (err) {
      addToast(`Failed to discard lines: ${String(err)}`, 'error');
    } finally {
      setHunkActionLoading(null);
    }
  };

  useEffect(() => {
    let active = true;
    async function loadDiff() {
      setLoading(true);
      try {
        if (isImage) {
          if (commitId) {
            const parent = await getParentCommitId(commitId).catch(() => null);
            const afterB64 = await getFileContentAtCommit(commitId, path);
            if (active) {
              setAfterImage(`data:image/png;base64,${afterB64}`);
            }
            if (parent) {
              const beforeB64 = await getFileContentAtCommit(parent, path).catch(() => null);
              if (active) {
                setBeforeImage(beforeB64 ? `data:image/png;base64,${beforeB64}` : null);
              }
            } else {
              if (active) setBeforeImage(null);
            }
          } else {
            const fullPath = repositoryPath + '/' + path;
            const diskUrl = convertFileSrc(fullPath);
            if (active) {
              setAfterImage(diskUrl);
            }
            const beforeB64 = await getFileContentAtCommit(null, path).catch(() => null);
            if (active) {
              setBeforeImage(beforeB64 ? `data:image/png;base64,${beforeB64}` : null);
            }
          }
        } else {
          const result = await getDiff(path, commitId, staged);
          if (active) {
            setDiff(result);
          }
        }
      } catch (err) {
        if (active) {
          addToast(`Failed to load diff for ${path}: ${String(err)}`, 'error');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadDiff();
    return () => {
      active = false;
    };
  }, [path, commitId, staged, refreshKey, addToast, isImage, repositoryPath]);

  if (loading) {
    return (
      <div className="diff-viewer diff-viewer--loading">
        <div className="diff-viewer__message">Loading diff...</div>
      </div>
    );
  }

  if (isImage) {
    return <ImageDiff path={path} beforeImage={beforeImage} afterImage={afterImage} />;
  }

  if (!diff || diff.hunks.length === 0) {
    return (
      <div className="diff-viewer diff-viewer--empty">
        <div className="diff-viewer__message">No changes or binary file.</div>
      </div>
    );
  }

  return (
    <div className="diff-viewer">
      <div className="diff-viewer__header">
        <span className="diff-viewer__path">{path}</span>
        <div className={styles.style3}>
          <div className="view-mode-toggle">
            <button
              className="btn"
              style={{
                padding: 'var(--spacing-1) var(--spacing-3)',
                fontSize: '11px',
                borderRadius: 0,
                backgroundColor: viewMode === 'inline' ? 'var(--color-bg-tertiary)' : 'var(--color-bg-primary)',
                color: viewMode === 'inline' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                fontWeight: viewMode === 'inline' ? 600 : 500,
                border: 'none',
                height: '24px'
              }}
              onClick={() => setViewMode('inline')}
            >
              Inline
            </button>
            <button
              className="btn"
              style={{
                padding: 'var(--spacing-1) var(--spacing-3)',
                fontSize: '11px',
                borderRadius: 0,
                backgroundColor: viewMode === 'split' ? 'var(--color-bg-tertiary)' : 'var(--color-bg-primary)',
                color: viewMode === 'split' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                fontWeight: viewMode === 'split' ? 600 : 500,
                border: 'none',
                height: '24px'
              }}
              onClick={() => setViewMode('split')}
            >
              Split
            </button>
            <button
              className="btn"
              style={{
                padding: 'var(--spacing-1) var(--spacing-3)',
                fontSize: '11px',
                borderRadius: 0,
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
                border: 'none',
                height: '24px',
                marginLeft: 'var(--spacing-2)'
              }}
              title="Open in External Diff Tool"
              onClick={async () => {
                try {
                  await launchExternalDiff(path);
                } catch (err) {
                  addToast(`Failed to launch external diff tool: ${String(err)}`, 'error');
                }
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', fill: 'currentColor', verticalAlign: 'middle' }}>
                <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
              </svg>
            </button>
          </div>
          <div className="diff-viewer__badges">
            {staged ? (
              <span className="badge badge--staged">Staged</span>
            ) : commitId ? (
              <span className="badge badge--commit">Commit: {commitId.substring(0, 7)}</span>
            ) : (
              <span className="badge badge--unstaged">Unstaged</span>
            )}
          </div>
        </div>
      </div>
      <div className="diff-viewer__content">
        <DiffContent
          hunks={diff.hunks}
          path={path}
          viewMode={viewMode}
          staged={staged}
          commitId={commitId}
          selectedKeys={selectedKeys}
          setSelectedKeys={setSelectedKeys}
          hunkActionLoading={hunkActionLoading}
          handleStageSelected={handleStageSelected}
          handleUnstageSelected={handleUnstageSelected}
          handleDiscardSelected={handleDiscardSelected}
          getHunkSelectionState={getHunkSelectionState}
        />
      </div>
    </div>
  );
}
