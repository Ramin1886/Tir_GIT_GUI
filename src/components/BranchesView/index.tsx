import { useBranches } from './useBranches';
import "./BranchesView.css";

import { ContextMenu } from '../ContextMenu';
import { BranchList } from './BranchList';
import { CompareBranches } from './CompareBranches';
import { BranchModals } from './Modals';

import styles from "./BranchesView.module.css";

export function BranchesView() {
  const { branches, localBranches, remoteBranches, error, actionLoading, showCreateModal, setShowCreateModal, newBranchName, setNewBranchName, showRenameModal, setShowRenameModal, oldBranchName, renameBranchName, setRenameBranchName, activeTab, setActiveTab, baseBranch, setBaseBranch, compareBranch, setCompareBranch, comparison, comparisonLoading, comparisonError, contextMenu, setContextMenu, dropOperation, setDropOperation, predictiveConflicts, checkingConflicts, showCheckoutPrompt, setShowCheckoutPrompt, targetCheckoutBranch, setTargetCheckoutBranch, handleCheckout, handleCheckoutAutoStash, handleCheckoutDiscard, handleCreateBranch, handleDelete, handleRename, handleRenameSubmit, handleDeleteRemote, handleBranchDrop, handleMergeBranches, handleRebaseBranches } = useBranches();
  return (
    <div className="branches-view">
      <div className="branches-view__header">
        <h2 className="branches-view__title">Branches</h2>
        <div className="branches-view__actions">
          <button
            className="btn btn--primary"
            onClick={() => setShowCreateModal(true)}
            disabled={actionLoading !== null}
          >
            Create Branch
          </button>
        </div>
      </div>
      <div className={styles.style1}>
        <button
          style={{
            padding: 'var(--spacing-3) var(--spacing-4)',
            border: 'none',
            background: 'none',
            color: activeTab === 'list' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'list' ? 600 : 500,
            borderBottom: activeTab === 'list' ? '2px solid var(--color-accent)' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: 'var(--font-size-sm)',
          }}
          onClick={() => setActiveTab('list')}
        >
          Branch List
        </button>
        <button
          style={{
            padding: 'var(--spacing-3) var(--spacing-4)',
            border: 'none',
            background: 'none',
            color: activeTab === 'compare' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'compare' ? 600 : 500,
            borderBottom: activeTab === 'compare' ? '2px solid var(--color-accent)' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: 'var(--font-size-sm)',
          }}
          onClick={() => setActiveTab('compare')}
        >
          Compare Branches
        </button>
      </div>
      <div className="branches-view__content">
        {error && <p className={styles.style2}>Error: {error}</p>}

        {activeTab === 'list' && (
          <BranchList
            localBranches={localBranches}
            remoteBranches={remoteBranches}
            actionLoading={actionLoading}
            handleCheckout={handleCheckout}
            handleRename={handleRename}
            handleDelete={handleDelete}
            handleDeleteRemote={handleDeleteRemote}
            handleBranchDrop={handleBranchDrop}
            setContextMenu={setContextMenu}
            setCompareBranch={setCompareBranch}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'compare' && (
          <CompareBranches
            branches={branches}
            baseBranch={baseBranch}
            setBaseBranch={setBaseBranch}
            compareBranch={compareBranch}
            setCompareBranch={setCompareBranch}
            comparisonLoading={comparisonLoading}
            comparisonError={comparisonError}
            comparison={comparison}
          />
        )}
      </div>
      <BranchModals
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        newBranchName={newBranchName}
        setNewBranchName={setNewBranchName}
        handleCreateBranch={handleCreateBranch}
        showRenameModal={showRenameModal}
        setShowRenameModal={setShowRenameModal}
        oldBranchName={oldBranchName}
        renameBranchName={renameBranchName}
        setRenameBranchName={setRenameBranchName}
        handleRenameSubmit={handleRenameSubmit}
        showCheckoutPrompt={showCheckoutPrompt}
        setShowCheckoutPrompt={setShowCheckoutPrompt}
        targetCheckoutBranch={targetCheckoutBranch}
        setTargetCheckoutBranch={setTargetCheckoutBranch}
        handleCheckoutAutoStash={handleCheckoutAutoStash}
        handleCheckoutDiscard={handleCheckoutDiscard}
        dropOperation={dropOperation}
        setDropOperation={setDropOperation}
        checkingConflicts={checkingConflicts}
        predictiveConflicts={predictiveConflicts}
        handleMergeBranches={handleMergeBranches}
        handleRebaseBranches={handleRebaseBranches}
        setBaseBranch={setBaseBranch}
        setCompareBranch={setCompareBranch}
        setActiveTab={setActiveTab}
        actionLoading={actionLoading}
      />
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
