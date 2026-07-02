
import { BranchInfo } from '../../api/git';
import { Spinner } from './Spinner';

import styles from "./BranchList.module.css";

interface BranchListProps {
  localBranches: BranchInfo[];
  remoteBranches: BranchInfo[];
  actionLoading: string | null;
  handleCheckout: (shorthand: string) => void;
  handleRename: (shorthand: string) => void;
  handleDelete: (shorthand: string) => void;
  handleDeleteRemote: (shorthand: string) => void;
  handleBranchDrop: (source: string, target: string) => void;
  setContextMenu: (menu: { x: number; y: number; items: Array<{ label: string; action: () => void; danger?: boolean; disabled?: boolean }> }) => void;
  setCompareBranch: (branch: string) => void;
  setActiveTab: (tab: 'list' | 'compare') => void;
}

export function BranchList({
  localBranches,
  remoteBranches,
  actionLoading,
  handleCheckout,
  handleRename,
  handleDelete,
  handleDeleteRemote,
  handleBranchDrop,
  setContextMenu,
  setCompareBranch,
  setActiveTab
}: BranchListProps) {
  return (
    <>
      <div className="branch-section">
        <h3 className="branch-section__title">
          Local Branches
        </h3>
        <div className="branch-list">
          {localBranches.length === 0 ? (
            <p className={styles.style4}>No local branches found.</p>
          ) : (
            localBranches.map((branch) => {
              const isCheckingOut = actionLoading === `checkout-${branch.shorthand}`;
              const isDeleting = actionLoading === `delete-${branch.shorthand}`;
              const isRenaming = actionLoading === `rename-${branch.shorthand}`;

              return (
                <div
                  key={branch.name}
                  className={`branch-item ${branch.is_head ? 'branch-item--active' : ''} ${styles.style5}`}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', branch.shorthand);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const draggedBranch = e.dataTransfer.getData('text/plain');
                    if (draggedBranch && draggedBranch !== branch.shorthand) {
                      handleBranchDrop(draggedBranch, branch.shorthand);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      items: [
                        ...(!branch.is_head ? [{
                          label: 'Checkout Branch',
                          action: () => handleCheckout(branch.shorthand)
                        }] : []),
                        {
                          label: 'Rename Branch',
                          action: () => handleRename(branch.shorthand)
                        },
                        ...(!branch.is_head ? [{
                          label: 'Delete Branch',
                          danger: true,
                          action: () => handleDelete(branch.shorthand)
                        }] : []),
                        {
                          label: 'Compare Branch',
                          action: () => {
                            setCompareBranch(branch.shorthand);
                            setActiveTab('compare');
                          }
                        }
                      ]
                    });
                  }}>
                  <div className="branch-item__details">
                    <span
                      className="branch-item__name"
                      style={{
                        fontWeight: branch.is_head ? 600 : 500,
                        color: branch.is_head ? 'var(--color-accent)' : 'var(--color-text-primary)',
                      }}
                    >
                      {branch.shorthand}
                    </span>
                    {branch.is_head && (
                      <span className="badge badge--staged">Active</span>
                    )}
                    {branch.upstream && (
                      <span className="branch-item__upstream">
                        tracked to <span className={styles.style8}>{branch.upstream}</span>
                        {branch.ahead !== undefined && branch.ahead > 0 && (
                          <span className="badge badge--ahead">
                            ↑ {branch.ahead}
                          </span>
                        )}
                        {branch.behind !== undefined && branch.behind > 0 && (
                          <span className="badge badge--behind">
                            ↓ {branch.behind}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="branch-item__actions">
                    {!branch.is_head && (
                      <button
                        className="btn btn--secondary"
                        onClick={() => handleCheckout(branch.shorthand)}
                        disabled={actionLoading !== null}>
                        {isCheckingOut ? <Spinner /> : null}
                        Checkout
                      </button>
                    )}
                    <button
                      className="btn btn--secondary"
                      onClick={() => handleRename(branch.shorthand)}
                      disabled={actionLoading !== null}>
                      {isRenaming ? <Spinner /> : null}
                      Rename
                    </button>
                    {!branch.is_head && (
                      <button
                        className="btn btn--danger"
                        onClick={() => handleDelete(branch.shorthand)}
                        disabled={actionLoading !== null}>
                        {isDeleting ? <Spinner /> : null}
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="branch-section">
        <h3 className="branch-section__title">
          Remote Branches
        </h3>
        <div className="branch-list">
          {remoteBranches.length === 0 ? (
            <p className={styles.style17}>No remote branches found.</p>
          ) : (
            remoteBranches.map((branch) => {
              const isCheckingOut = actionLoading === `checkout-${branch.shorthand}`;
              const isDeleting = actionLoading === `delete-remote-${branch.shorthand}`;

              return (
                <div
                  key={branch.name}
                  className="branch-item"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      items: [
                        {
                          label: 'Checkout Local Branch',
                          action: () => handleCheckout(branch.shorthand)
                        },
                        {
                          label: 'Delete Remote Branch',
                          danger: true,
                          action: () => handleDeleteRemote(branch.shorthand)
                        }
                      ]
                    });
                  }}>
                  <div className="branch-item__details">
                    <span className="branch-item__name">
                      {branch.shorthand}
                    </span>
                  </div>
                  <div className="branch-item__actions">
                    <button
                      className="btn btn--secondary"
                      onClick={() => handleCheckout(branch.shorthand)}
                      disabled={actionLoading !== null}>
                      {isCheckingOut ? <Spinner /> : null}
                      Checkout Local
                    </button>
                    <button
                      className="btn btn--danger"
                      onClick={() => handleDeleteRemote(branch.shorthand)}
                      disabled={actionLoading !== null}>
                      {isDeleting ? <Spinner /> : null}
                      Delete Remote
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
