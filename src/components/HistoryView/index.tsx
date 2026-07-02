import "./HistoryView.css";
import { useHistory } from './useHistory';
import { DiffViewer } from '../DiffViewer';
import { InteractiveRebaseModal } from '../InteractiveRebaseModal';
import { BlameViewer } from '../BlameViewer';
import { ContextMenu } from '../ContextMenu';
import { HistoryFilters } from './HistoryFilters';
import { CommitList } from './CommitList';
import { CommitDetailsPanel } from './CommitDetailsPanel';
import { cherryPick, revertCommit } from '../../api/git';
import { useAppStore } from '../../store';

import styles from "./HistoryView.module.css";

export function HistoryView() {
  const {
    dagMap,
    error,
    selectedCommitId,
    setSelectedCommitId,
    commitDetails,
    loadingDetails,
    viewingDiffFile,
    setViewingDiffFile,
    showRebaseModal,
    setShowRebaseModal,
    modalViewMode,
    setModalViewMode,
    contextMenu,
    setContextMenu,
    refsMap,
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
    ciStatuses,
    fetchHistory,
    rowVirtualizer,
    handlePathFilterSubmit,
    handleContentFilterSubmit,
    handleAuthorFilterSubmit,
    handleDateFilterSubmit,
    handleCopyHash,
    handleCherryPick,
    handleRevert,
    handleOpenFile,
    filteredCommits,
    parentRef
  } = useHistory();
  const { addToast } = useAppStore();

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setViewingDiffFile(null);
    }
  };

  if (error) {
    return (
      <div className="history-view">
        <div className="history-view__header">
          <h2 className="history-view__title">History</h2>
        </div>
        <div className="history-view__split-container">
          <div className="history-view__list-panel">
            <p className={styles.style2}>Error loading history: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="history-view">
      <div className="history-view__header">
        <h2 className="history-view__title">History</h2>
        <button
          className="btn btn--secondary"
          onClick={() => setDetailsCollapsed(!detailsCollapsed)}>
          {detailsCollapsed ? '→ Show Details' : '← Hide Details'}
        </button>
      </div>
      <div className="history-view__split-container">
        <div className="history-view__list-panel">
          <HistoryFilters
            filterKeyword={filterKeyword}
            setFilterKeyword={setFilterKeyword}
            filterAuthor={filterAuthor}
            setFilterAuthor={setFilterAuthor}
            filterDateStart={filterDateStart}
            setFilterDateStart={setFilterDateStart}
            filterDateEnd={filterDateEnd}
            setFilterDateEnd={setFilterDateEnd}
            filterPath={filterPath}
            setFilterPath={setFilterPath}
            handlePathFilterSubmit={handlePathFilterSubmit}
            filterContent={filterContent}
            setFilterContent={setFilterContent}
            handleContentFilterSubmit={handleContentFilterSubmit}
            handleAuthorFilterSubmit={handleAuthorFilterSubmit}
            handleDateFilterSubmit={handleDateFilterSubmit}
          />
          <CommitList
            filteredCommits={filteredCommits}
            rowVirtualizer={rowVirtualizer}
            parentRef={parentRef}
            selectedCommitId={selectedCommitId}
            setSelectedCommitId={setSelectedCommitId}
            dagMap={dagMap}
            ciStatuses={ciStatuses}
            refsMap={refsMap}
            setContextMenu={setContextMenu}
            addToast={addToast}
            cherryPick={async (id) => { await cherryPick(id); }}
            revertCommit={async (id) => { await revertCommit(id); }}
            fetchHistory={fetchHistory}
            filterPathActive={filterPathActive}
            setShowRebaseModal={setShowRebaseModal}
          />
        </div>

        {!detailsCollapsed && (
          <div className="history-view__detail-panel">
            <CommitDetailsPanel
              commitDetails={commitDetails}
              loadingDetails={loadingDetails}
              handleCopyHash={handleCopyHash}
              handleCherryPick={handleCherryPick}
              handleRevert={handleRevert}
              setShowRebaseModal={setShowRebaseModal}
              handleOpenFile={handleOpenFile}
              setContextMenu={setContextMenu}
              setModalViewMode={setModalViewMode}
              setViewingDiffFile={setViewingDiffFile}
              setFilterPath={setFilterPath}
              setFilterPathActive={setFilterPathActive}
            />
          </div>
        )}
      </div>
      {viewingDiffFile && (
        <div className="modal-overlay" onClick={handleOverlayClick}>
          <div className="modal-container">
            <div className="modal-header">
              <span className="modal-title">
                {modalViewMode === 'diff' ? 'Diff' : 'Blame'}: {viewingDiffFile.path}
              </span>
              <div className={styles.style9}>
                <button
                  className="btn btn--secondary"
                  onClick={() => setModalViewMode(modalViewMode === 'diff' ? 'blame' : 'diff')}>
                  {modalViewMode === 'diff' ? 'Show Blame' : 'Show Diff'}
                </button>
                <button className="modal-close" onClick={() => setViewingDiffFile(null)}>
                  &times;
                </button>
              </div>
            </div>
            <div className="modal-body">
              {modalViewMode === 'diff' ? (
                <DiffViewer
                  path={viewingDiffFile.path}
                  commitId={viewingDiffFile.commitId}
                />
              ) : (
                <BlameViewer
                  path={viewingDiffFile.path}
                  commitId={viewingDiffFile.commitId}
                />
              )}
            </div>
          </div>
        </div>
      )}
      {showRebaseModal && commitDetails && (
        <InteractiveRebaseModal
          baseCommitId={commitDetails.id}
          baseCommitMessage={commitDetails.message}
          onClose={() => setShowRebaseModal(false)}
          onSuccess={() => fetchHistory(false, filterPathActive)}
        />
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
