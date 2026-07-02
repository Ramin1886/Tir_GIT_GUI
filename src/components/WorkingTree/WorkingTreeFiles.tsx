import { Spinner } from './Spinner';
import { getStatusClass } from './workingTreeUtils';
import { WorkingTreeStatus } from '../../api/git';
import { View, useAppStore } from '../../store';
import { openPath } from '@tauri-apps/plugin-opener';
import { motion, AnimatePresence } from 'framer-motion';

import styles from "./WorkingTreeFiles.module.css";

interface WorkingTreeFilesProps {
  status: WorkingTreeStatus;
  selectedFile: { path: string; staged: boolean } | null;
  setSelectedFile: (file: { path: string; staged: boolean } | null) => void;
  actionLoading: string | null;
  handleStageAll: () => void;
  handleUnstageAll: () => void;
  handleStage: (path: string) => void;
  handleUnstage: (path: string) => void;
  handleDiscard: (path: string) => void;
  handleLaunchMerge: (path: string) => void;
  setContextMenu: (menu: { x: number; y: number; items: Array<{ label: string; action: () => void; danger?: boolean; disabled?: boolean }> }) => void;
  setViewingBlamePath: (path: string | null) => void;
  setHistoryFileFilter: (path: string) => void;
  setCurrentView: (view: View) => void;
}

export function WorkingTreeFiles({
  status, selectedFile, setSelectedFile, actionLoading,
  handleStageAll, handleUnstageAll, handleStage, handleUnstage,
  handleDiscard, handleLaunchMerge, setContextMenu, setViewingBlamePath,
  setHistoryFileFilter, setCurrentView
}: WorkingTreeFilesProps) {
  const { repositoryPath, addToast } = useAppStore();
  const isClean = status.staged.length === 0 && status.unstaged.length === 0 && status.untracked.length === 0;

  const handleOpenExternally = async (path: string) => {
    try {
      await openPath(`${repositoryPath}/${path}`);
    } catch (err) {
      addToast(`Failed to open file: ${String(err)}`, 'error');
    }
  };

  return (
    <div className="working-tree__files-list">
      {/* Staged Changes Section */}
      {status.staged.length > 0 && (
        <div className={styles.style1}>
          <div className={styles.style2}>
            <h3 className={styles.style3}>Staged Changes</h3>
            <button
              className="btn btn--secondary"
              onClick={handleUnstageAll}
              disabled={actionLoading !== null}>
              {actionLoading === 'unstage-all' ? <Spinner /> : null}
              Unstage All
            </button>
          </div>
          <div className="file-list">
            <AnimatePresence initial={false}>
            {status.staged.map((f) => {
              const isPending = actionLoading === `unstage-${f.path}`;
              const statusClass = getStatusClass(f.status);
              return (
                <motion.div
                  key={f.path}
                  initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.15 }}
                  tabIndex={0}
                  className={`file-item ${selectedFile?.path === f.path && selectedFile?.staged === true ? 'file-item--active' : ''}`}
                  onClick={() => setSelectedFile({ path: f.path, staged: true })}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Spacebar') {
                      e.preventDefault();
                      handleUnstage(f.path);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setSelectedFile({ path: f.path, staged: true });
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      items: [
                        { label: 'Unstage File', action: () => handleUnstage(f.path) },
                        { label: 'View Blame (HEAD)', action: () => setViewingBlamePath(f.path) },
                        { label: 'File History', action: () => { setHistoryFileFilter(f.path); setCurrentView('HISTORY'); } }
                      ]
                    });
                  }}
                >
                  <div className={styles.style5}>
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={(e) => { e.stopPropagation(); handleUnstage(f.path); }}
                      disabled={actionLoading !== null}
                      onClick={(e) => e.stopPropagation()}
                      className={styles.style6}
                    />
                    <span className={`file-item__status ${statusClass}`}>{f.status}</span>
                    <span className="file-item__path" title={f.path}>{f.path}</span>
                  </div>
                  <div className="file-item__actions">
                    <button
                      className="file-item__btn"
                      title="Open externally"
                      onClick={(e) => { e.stopPropagation(); handleOpenExternally(f.path); }}
                      disabled={actionLoading !== null}
                    >
                      ↗
                    </button>
                    <button
                      className="file-item__btn"
                      title="Unstage file"
                      onClick={(e) => { e.stopPropagation(); handleUnstage(f.path); }}
                      disabled={actionLoading !== null}
                    >
                      {isPending ? <Spinner /> : '-'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
          </div>
        </div>
      )}
      {/* Unstaged Changes Section */}
      {status.unstaged.length > 0 && (
        <div className={styles.style8}>
          <div className={styles.style9}>
            <h3 className={styles.style10}>Unstaged Changes</h3>
            {status.unstaged.length + status.untracked.length > 0 && (
              <button
                className="btn btn--primary"
                onClick={handleStageAll}
                disabled={actionLoading !== null}>
                {actionLoading === 'stage-all' ? <Spinner /> : null}
                Stage All
              </button>
            )}
          </div>
          <div className="file-list">
            <AnimatePresence initial={false}>
            {status.unstaged.map((f) => {
              const isStaging = actionLoading === `stage-${f.path}`;
              const isDiscarding = actionLoading === `discard-${f.path}`;
              const isMerging = actionLoading === `merge-${f.path}`;
              const isConflicted = f.status === 'U';
              const statusClass = getStatusClass(f.status);

              return (
                <motion.div
                  key={f.path}
                  initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.15 }}
                  tabIndex={0}
                  className={`file-item ${selectedFile?.path === f.path && selectedFile?.staged === false ? 'file-item--active' : ''}`}
                  onClick={() => setSelectedFile({ path: f.path, staged: false })}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Spacebar') {
                      e.preventDefault();
                      if (!isConflicted) handleStage(f.path);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setSelectedFile({ path: f.path, staged: false });
                    const menuItems = [
                      { label: 'Stage File', action: () => handleStage(f.path) },
                      { label: 'Discard Changes', danger: true, action: () => handleDiscard(f.path) },
                      { label: 'View Blame (HEAD)', action: () => setViewingBlamePath(f.path) },
                      { label: 'File History', action: () => { setHistoryFileFilter(f.path); setCurrentView('HISTORY'); } }
                    ];
                    if (isConflicted) {
                      menuItems.unshift({ label: 'Resolve Conflicts (External Tool)', action: () => handleLaunchMerge(f.path) });
                    }
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      items: menuItems
                    });
                  }}
                >
                  <div className={styles.style12}>
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={(e) => { e.stopPropagation(); handleStage(f.path); }}
                      disabled={actionLoading !== null || isConflicted}
                      style={{ cursor: isConflicted ? 'not-allowed' : 'pointer', marginRight: 'var(--spacing-1)' }}
                      onClick={(e) => e.stopPropagation()}
                      title={isConflicted ? "Resolve conflicts before staging" : "Stage file"}
                    />
                    <span className={`file-item__status ${statusClass}`}>{f.status}</span>
                    <span className="file-item__path" title={f.path}>{f.path}</span>
                  </div>
                  <div className="file-item__actions">
                    {isConflicted && (
                      <button
                        className="file-item__btn file-item__btn--merge"
                        title="Resolve merge conflicts with external tool"
                        onClick={(e) => { e.stopPropagation(); handleLaunchMerge(f.path); }}
                        disabled={actionLoading !== null}
                      >
                        {isMerging ? <Spinner /> : '\u2692'}
                      </button>
                    )}
                    <button
                      className="file-item__btn"
                      title="Open externally"
                      onClick={(e) => { e.stopPropagation(); handleOpenExternally(f.path); }}
                      disabled={actionLoading !== null}
                    >
                      ↗
                    </button>
                    <button
                      className="file-item__btn"
                      title="Stage file"
                      onClick={(e) => { e.stopPropagation(); handleStage(f.path); }}
                      disabled={actionLoading !== null}
                    >
                      {isStaging ? <Spinner /> : '+'}
                    </button>
                    <button
                      className="file-item__btn file-item__btn--discard"
                      title="Discard changes"
                      onClick={(e) => { e.stopPropagation(); handleDiscard(f.path); }}
                      disabled={actionLoading !== null}
                    >
                      {isDiscarding ? <Spinner /> : '\u00D7'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
          </div>
        </div>
      )}
      {/* Untracked Files Section */}
      {status.untracked.length > 0 && (
        <div className={styles.style14}>
          <div className={styles.style15}>
            <h3 className={styles.style16}>Untracked Files</h3>
            {status.unstaged.length === 0 && (
              <button
                className="btn btn--primary"
                onClick={handleStageAll}
                disabled={actionLoading !== null}>
                {actionLoading === 'stage-all' ? <Spinner /> : null}
                Stage All
              </button>
            )}
          </div>
          <div className="file-list">
            <AnimatePresence initial={false}>
            {status.untracked.map((f) => {
              const isStaging = actionLoading === `stage-${f.path}`;
              const isDiscarding = actionLoading === `discard-${f.path}`;
              const statusClass = getStatusClass(f.status);

              return (
                <motion.div
                  key={f.path}
                  initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.15 }}
                  tabIndex={0}
                  className={`file-item ${selectedFile?.path === f.path && selectedFile?.staged === false ? 'file-item--active' : ''}`}
                  onClick={() => setSelectedFile({ path: f.path, staged: false })}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Spacebar') {
                      e.preventDefault();
                      handleStage(f.path);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setSelectedFile({ path: f.path, staged: false });
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      items: [
                        { label: 'Stage File', action: () => handleStage(f.path) },
                        { label: 'Discard File (Delete)', danger: true, action: () => handleDiscard(f.path) },
                        { label: 'File History', action: () => { setHistoryFileFilter(f.path); setCurrentView('HISTORY'); } }
                      ]
                    });
                  }}
                >
                  <div className={styles.style18}>
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={(e) => { e.stopPropagation(); handleStage(f.path); }}
                      disabled={actionLoading !== null}
                      onClick={(e) => e.stopPropagation()}
                      className={styles.style19}
                    />
                    <span className={`file-item__status ${statusClass}`}>{f.status}</span>
                    <span className="file-item__path" title={f.path}>{f.path}</span>
                  </div>
                  <div className="file-item__actions">
                    <button
                      className="file-item__btn"
                      title="Open externally"
                      onClick={(e) => { e.stopPropagation(); handleOpenExternally(f.path); }}
                      disabled={actionLoading !== null}
                    >
                      ↗
                    </button>
                    <button
                      className="file-item__btn"
                      title="Stage file"
                      onClick={(e) => { e.stopPropagation(); handleStage(f.path); }}
                      disabled={actionLoading !== null}
                    >
                      {isStaging ? <Spinner /> : '+'}
                    </button>
                    <button
                      className="file-item__btn file-item__btn--discard"
                      title="Discard file"
                      onClick={(e) => { e.stopPropagation(); handleDiscard(f.path); }}
                      disabled={actionLoading !== null}
                    >
                      {isDiscarding ? <Spinner /> : '\u00D7'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
          </div>
        </div>
      )}
      {isClean && (
        <p className={styles.style21}>
          Working tree is clean.
        </p>
      )}
    </div>
  );
}
