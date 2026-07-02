import { CommitDetails } from '../../api/git';

import styles from "./CommitDetailsPanel.module.css";

interface CommitDetailsPanelProps {
  commitDetails: CommitDetails | null;
  loadingDetails: boolean;
  handleCopyHash: () => void;
  handleCherryPick: () => void;
  handleRevert: () => void;
  setShowRebaseModal: (show: boolean) => void;
  handleOpenFile: (path: string, commitId: string) => void;
  setContextMenu: (menu: { x: number; y: number; items: Array<{ label: string; action: () => void; danger?: boolean; disabled?: boolean }> }) => void;
  setModalViewMode: (mode: 'diff' | 'blame') => void;
  setViewingDiffFile: (file: { path: string; commitId: string } | null) => void;
  setFilterPath: (path: string) => void;
  setFilterPathActive: (path: string) => void;
}

export function CommitDetailsPanel({
  commitDetails, loadingDetails, handleCopyHash, handleCherryPick, handleRevert, setShowRebaseModal,
  handleOpenFile, setContextMenu, setModalViewMode, setViewingDiffFile, setFilterPath, setFilterPathActive
}: CommitDetailsPanelProps) {
  if (loadingDetails) {
    return (
      <div className="history-view__no-selection">
        <p>Loading details...</p>
      </div>
    );
  }

  if (!commitDetails) {
    return (
      <div className="history-view__no-selection">
        <p>Select a commit to view metadata and changed files</p>
      </div>
    );
  }

  return (
    <div className="commit-details">
      <div className="commit-details__header">
        <div className={styles.style2}>
          <h3 className="commit-details__title">{commitDetails.message}</h3>
          <div className={styles.style4}>
            <button className="btn btn--secondary" onClick={handleCopyHash}>
              Copy SHA
            </button>
            <button className="btn btn--primary" onClick={handleCherryPick}>
              Cherry-pick
            </button>
            <button className="btn btn--danger" onClick={handleRevert}>
              Revert
            </button>
            <button className="btn btn--secondary" onClick={() => setShowRebaseModal(true)}>
              Rebase Interactive
            </button>
          </div>
        </div>
        <div className="commit-details__meta">
          <span>
            <strong>Author:</strong> {commitDetails.author} &lt;{commitDetails.email}&gt;
          </span>
          <span>
            <strong>Date:</strong> {new Date(commitDetails.time * 1000).toLocaleString()}
          </span>
          <span>
            <strong>Commit:</strong> <span className="commit-details__id">{commitDetails.id}</span>
          </span>
        </div>
      </div>
      <div className="commit-details__files-section">
        <h4 className="commit-details__files-title">Files Changed</h4>
        <div className="commit-details__files-list">
          {commitDetails.files.length === 0 ? (
            <p className={styles.style9}>
              No file modifications or merge commit.
            </p>
          ) : (
            commitDetails.files.map((file) => (
              <div
                key={file}
                className="commit-details__file-item"
                onClick={() => handleOpenFile(file, commitDetails.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    items: [
                      {
                        label: 'View Diff',
                        action: () => handleOpenFile(file, commitDetails.id)
                      },
                      {
                        label: 'View Blame',
                        action: () => {
                          setModalViewMode('blame');
                          setViewingDiffFile({ path: file, commitId: commitDetails.id });
                        }
                      },
                      {
                        label: 'Filter History by File',
                        action: () => {
                          setFilterPath(file);
                          setFilterPathActive(file);
                        }
                      }
                    ]
                  });
                }}
              >
                <span className="commit-details__file-path">{file}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
