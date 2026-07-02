import React from 'react';
import { Spinner } from './Spinner';

import styles from "./Modals.module.css";

interface ModalsProps {
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
  newBranchName: string;
  setNewBranchName: (name: string) => void;
  handleCreateBranch: (e: React.FormEvent) => void;
  
  showRenameModal: boolean;
  setShowRenameModal: (show: boolean) => void;
  oldBranchName: string;
  renameBranchName: string;
  setRenameBranchName: (name: string) => void;
  handleRenameSubmit: (e: React.FormEvent) => void;
  
  showCheckoutPrompt: boolean;
  setShowCheckoutPrompt: (show: boolean) => void;
  targetCheckoutBranch: string;
  setTargetCheckoutBranch: (branch: string) => void;
  handleCheckoutAutoStash: () => void;
  handleCheckoutDiscard: () => void;

  dropOperation: { source: string; target: string } | null;
  setDropOperation: (op: { source: string; target: string } | null) => void;
  checkingConflicts: boolean;
  predictiveConflicts: string[] | null;
  handleMergeBranches: (source: string, target: string) => void;
  handleRebaseBranches: (source: string, target: string) => void;
  
  setBaseBranch: (b: string) => void;
  setCompareBranch: (b: string) => void;
  setActiveTab: (tab: 'list' | 'compare') => void;

  actionLoading: string | null;
}

export function BranchModals({
  showCreateModal, setShowCreateModal, newBranchName, setNewBranchName, handleCreateBranch,
  showRenameModal, setShowRenameModal, oldBranchName, renameBranchName, setRenameBranchName, handleRenameSubmit,
  showCheckoutPrompt, setShowCheckoutPrompt, targetCheckoutBranch, setTargetCheckoutBranch, handleCheckoutAutoStash, handleCheckoutDiscard,
  dropOperation, setDropOperation, checkingConflicts, predictiveConflicts, handleMergeBranches, handleRebaseBranches,
  setBaseBranch, setCompareBranch, setActiveTab,
  actionLoading
}: ModalsProps) {
  return (
    <>
      {/* Create Branch Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-branch-title">
            <div className="modal-header">
              <span id="create-branch-title" className="modal-title">Create New Branch</span>
              <button className="modal-close" onClick={() => setShowCreateModal(false)} aria-label="Close" title="Close">
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateBranch} className={styles.style3}>
              <div className={styles.style4}>
                <label className={styles.style5}>Branch Name</label>
                <input
                  type="text"
                  placeholder="e.g. feature/auth"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  autoFocus
                  required
                  className={styles.style6}
                />
              </div>
              <div className={styles.style7}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={actionLoading !== null}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Rename Branch Modal */}
      {showRenameModal && (
        <div className="modal-overlay" onClick={() => setShowRenameModal(false)}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-branch-title">
            <div className="modal-header">
              <span id="rename-branch-title" className="modal-title">Rename Branch "{oldBranchName}"</span>
              <button className="modal-close" onClick={() => setShowRenameModal(false)} aria-label="Close" title="Close">
                &times;
              </button>
            </div>
            <form onSubmit={handleRenameSubmit} className={styles.style10}>
              <div className={styles.style11}>
                <label className={styles.style12}>New Branch Name</label>
                <input
                  type="text"
                  value={renameBranchName}
                  onChange={(e) => setRenameBranchName(e.target.value)}
                  autoFocus
                  required
                  className={styles.style13}
                />
              </div>
              <div className={styles.style14}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setShowRenameModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={actionLoading !== null}
                >
                  Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Checkout Auto-Stash Prompt Modal */}
      {showCheckoutPrompt && (
        <div className="modal-overlay" onClick={() => setShowCheckoutPrompt(false)}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-conflict-title">
            <div className="modal-header">
              <span id="checkout-conflict-title" className="modal-title">Uncommitted Changes</span>
              <button className="modal-close" onClick={() => setShowCheckoutPrompt(false)} aria-label="Close" title="Close">
                &times;
              </button>
            </div>
            <div className={styles.style17}>
              <p className={styles.style18}>
                You have uncommitted changes. To switch to branch <strong>"{targetCheckoutBranch}"</strong>, you must stash or discard your changes first.
              </p>
              <div className={styles.style19}>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleCheckoutAutoStash}>
                  Auto-Stash and Switch
                </button>
                <button type="button" className="btn btn--danger" onClick={handleCheckoutDiscard}>
                  Discard Changes and Switch
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => { setShowCheckoutPrompt(false); setTargetCheckoutBranch(''); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Drag & Drop Branch Operations Modal */}
      {dropOperation && (
        <div className="modal-overlay" onClick={() => setDropOperation(null)}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="branch-action-title">
            <div className="modal-header">
              <span id="branch-action-title" className="modal-title">Branch Action</span>
              <button className="modal-close" onClick={() => setDropOperation(null)} aria-label="Close" title="Close">
                &times;
              </button>
            </div>
            <div className={styles.style25}>
              
              {/* Conflict Check Banner */}
              <div className={styles.style26}>
                <span className={styles.style27}>
                  Predictive Merge Conflict Analysis
                </span>
                {checkingConflicts ? (
                  <div className={styles.style28}>
                    <Spinner /> Analyzing files for potential conflicts...
                  </div>
                ) : predictiveConflicts === null ? (
                  <div className={styles.style29}>Pending analysis...</div>
                ) : predictiveConflicts.length === 0 ? (
                  <div className={styles.style30}>
                    🟢 Clean Merge Predicted. No conflicts detected.
                  </div>
                ) : (
                  <div className={styles.style31}>
                    <span className={styles.style32}>
                      ⚠️ Potential Conflicts Predicted in {predictiveConflicts.length} file(s):
                    </span>
                    <ul className={styles.style33}>
                      {predictiveConflicts.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <p className={styles.style34}>
                Choose the operation to perform with branch <strong>"{dropOperation.source}"</strong> on target <strong>"{dropOperation.target}"</strong>:
              </p>

              <div className={styles.style35}>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => handleMergeBranches(dropOperation.source, dropOperation.target)}
                  disabled={checkingConflicts || actionLoading !== null}>
                  Merge "{dropOperation.source}" into "{dropOperation.target}"
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => handleRebaseBranches(dropOperation.source, dropOperation.target)}
                  disabled={checkingConflicts || actionLoading !== null}>
                  Rebase "{dropOperation.target}" onto "{dropOperation.source}"
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => {
                    setBaseBranch(dropOperation.target);
                    setCompareBranch(dropOperation.source);
                    setDropOperation(null);
                    setActiveTab('compare');
                  }}>
                  Compare Branches
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setDropOperation(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
