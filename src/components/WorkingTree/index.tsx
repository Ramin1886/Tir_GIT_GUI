import "./WorkingTree.css";
import { useState } from 'react';
import { useAppStore } from '../../store';
import { DiffViewer } from '../DiffViewer';
import { BlameViewer } from '../BlameViewer';
import { ContextMenu } from '../ContextMenu';
import { Spinner } from './Spinner';
import { CommitComposer } from './CommitComposer';
import { WorkingTreeFiles } from './WorkingTreeFiles';
import { useWorkingTree } from './useWorkingTree';

import styles from "./WorkingTree.module.css";

export function WorkingTree() {
  const {
    status, error, selectedFile, setSelectedFile, actionLoading,
    commitMessage, setCommitMessage, coAuthors, setCoAuthors, amend, handleAmendChange, isCommitting,
    handleStage, handleUnstage, handleDiscard, handleStageAll, handleUnstageAll,
    handleLaunchMerge, handleCommitSubmit, handleRebaseContinue, handleRebaseAbort, fetchStatus,
    hasNewUpdates, applyUpdates
  } = useWorkingTree();

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: Array<{ label: string; action: () => void; danger?: boolean; disabled?: boolean }> } | null>(null);
  const [viewingBlamePath, setViewingBlamePath] = useState<string | null>(null);
  const [diffCollapsed, setDiffCollapsed] = useState(false);

  const { setHistoryFileFilter, setCurrentView } = useAppStore();

  if (error) {
    return (
      <div className="working-tree">
        <div className="working-tree__header">
          <h2 className="working-tree__title">Working Tree</h2>
        </div>
        <div className="working-tree__split-container">
          <div className="working-tree__files-panel">
            <p className={styles.style1}>Error: {error}</p>
          </div>
          <div className="working-tree__diff-panel">
            <div className="working-tree__no-diff">
              <p>Unavailable due to error loading repository status.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="working-tree">
        <div className="working-tree__header">
          <h2 className="working-tree__title">Working Tree</h2>
        </div>
        <div className="working-tree__split-container">
          <div className="working-tree__files-panel">
            <p>Loading status...</p>
          </div>
          <div className="working-tree__diff-panel">
            <div className="working-tree__no-diff">
              <p>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="working-tree">
      <div className="working-tree__header">
        <h2 className="working-tree__title">Working Tree</h2>
        <div className={styles.style3}>
          {hasNewUpdates && (
            <button className="btn btn--primary" onClick={applyUpdates}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.style5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Updates Available
            </button>
          )}
          <button
            className="btn btn--secondary"
            onClick={() => setDiffCollapsed(!diffCollapsed)}>
            {diffCollapsed ? '→ Show Diff' : '← Hide Diff'}
          </button>
        </div>
      </div>
      {status.rebase_in_progress && (
        <div
          className={styles.style7}
        >
          <div className={styles.style8}>
            <strong className={styles.style9}>Interactive Rebase in Progress:</strong>
            <span className={styles.style10}>Conflicts or edits paused. Resolve conflicts and continue.</span>
          </div>
          <div className={styles.style11}>
            <button
              className="btn btn--primary"
              onClick={handleRebaseContinue}
              disabled={actionLoading !== null}>
              {actionLoading === 'rebase-continue' ? <Spinner /> : null}
              Continue Rebase
            </button>
            <button
              className="btn btn--danger"
              onClick={handleRebaseAbort}
              disabled={actionLoading !== null}>
              {actionLoading === 'rebase-abort' ? <Spinner /> : null}
              Abort Rebase
            </button>
          </div>
        </div>
      )}
      <div className="working-tree__split-container">
        <div className="working-tree__files-panel">
          <WorkingTreeFiles
            status={status}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            actionLoading={actionLoading}
            handleStageAll={handleStageAll}
            handleUnstageAll={handleUnstageAll}
            handleStage={handleStage}
            handleUnstage={handleUnstage}
            handleDiscard={handleDiscard}
            handleLaunchMerge={handleLaunchMerge}
            setContextMenu={setContextMenu}
            setViewingBlamePath={setViewingBlamePath}
            setHistoryFileFilter={setHistoryFileFilter}
            setCurrentView={setCurrentView}
          />
          <CommitComposer
            commitMessage={commitMessage}
            setCommitMessage={setCommitMessage}
            coAuthors={coAuthors}
            setCoAuthors={setCoAuthors}
            amend={amend}
            handleAmendChange={handleAmendChange}
            isCommitting={isCommitting}
            status={status}
            handleCommitSubmit={handleCommitSubmit}
          />
        </div>

        {!diffCollapsed && (
          <div className="working-tree__diff-panel">
            {selectedFile ? (
              <DiffViewer
                path={selectedFile.path}
                staged={selectedFile.staged}
                onRefresh={() => fetchStatus(true)}
              />
            ) : (
              <div className="working-tree__no-diff">
                <p>Select a file to view its diff</p>
              </div>
            )}
          </div>
        )}
      </div>
      {viewingBlamePath && (
        <div className="modal-overlay" onClick={() => setViewingBlamePath(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                Blame: {viewingBlamePath}
              </span>
              <button className="modal-close" onClick={() => setViewingBlamePath(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <BlameViewer path={viewingBlamePath} />
            </div>
          </div>
        </div>
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
