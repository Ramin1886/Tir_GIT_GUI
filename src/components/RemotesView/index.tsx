import { useRemotes } from './useRemotes';


import styles from "./RemotesView.module.css";


const Spinner = () => (
  <svg className="animate-spin" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className={styles.style2} />
    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className={styles.style3} />
  </svg>
);

export function RemotesView() {
  const {
    remotes,
    branches,
    loading,
    actionLoading,
    error,
    showAddModal,
    setShowAddModal,
    newRemoteName,
    setNewRemoteName,
    newRemoteUrl,
    setNewRemoteUrl,
    showEditModal,
    setShowEditModal,
    editRemoteName,
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
    gitOutputTitle,
    showOutputModal,
    setShowOutputModal,
    handleAddRemote,
    handleEditRemote,
    handleEditRemoteSubmit,
    handleDeleteRemote,
    handleFetchRemote,
    handleSyncSubmit,
    openSyncModal
  } = useRemotes();

  return (
    <div className="remotes-view">
      <div className="remotes-view__header">
        <h2 className="remotes-view__title">Remotes</h2>
        <div className="remotes-view__actions">
          <button
            className="btn btn--primary"
            onClick={() => setShowAddModal(true)}
            disabled={actionLoading !== null}
          >
            Add Remote
          </button>
        </div>
      </div>
      <div className="remotes-view__content">
        {error && <p className={styles.style4}>Error: {error}</p>}

        {loading && remotes.length === 0 ? (
          <p className={styles.style5}>
            Loading remotes...
          </p>
        ) : remotes.length === 0 ? (
          <div className={styles.style6}>
            <p className={styles.style7}>
              No git remotes configured in this repository.
            </p>
            <button className="btn btn--primary" onClick={() => setShowAddModal(true)}>
              Add First Remote
            </button>
          </div>
        ) : (
          <div>
            {remotes.map((remote) => {
              const isFetching = actionLoading === `fetch-${remote.name}`;
              const isDeleting = actionLoading === `delete-${remote.name}`;
              const isPushing = actionLoading === `push-${remote.name}`;
              const isPulling = actionLoading === `pull-${remote.name}`;
              const isEditing = actionLoading === `edit-${remote.name}`;

              return (
                <div key={remote.name} className="remote-card">
                  <div className="remote-card__header">
                    <span className="remote-card__name">
                      <svg viewBox="0 0 16 16" className={styles.style8}>
                        <path d="M15.5 8a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0zm-7.5-6v5.07l-2.03-2.04-.7.71L8.71 9.2a.5.5 0 00.7 0l3.44-3.46-.71-.7L10 7.07V2H8z" />
                        <path d="M5.5 11h5a.5.5 0 010 1h-5a.5.5 0 010-1z" />
                      </svg>
                      {remote.name}
                    </span>
                    <div className={styles.style9}>
                      <button
                        className="btn btn--secondary"
                        onClick={() => handleEditRemote(remote)}
                        disabled={actionLoading !== null}>
                        {isEditing ? <Spinner /> : null}
                        Edit URL
                      </button>
                      <button
                        className="btn btn--danger"
                        onClick={() => handleDeleteRemote(remote.name)}
                        disabled={actionLoading !== null}>
                        {isDeleting ? <Spinner /> : null}
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="remote-card__urls">
                    <div className="remote-card__url-row">
                      <span className="remote-card__url-label">Fetch URL:</span>
                      <span className="remote-card__url-value">{remote.url || '(none)'}</span>
                    </div>
                    <div className="remote-card__url-row">
                      <span className="remote-card__url-label">Push URL:</span>
                      <span className="remote-card__url-value">{remote.push_url || remote.url || '(none)'}</span>
                    </div>
                  </div>
                  <div className="remote-card__actions">
                    <button
                      className="btn btn--secondary"
                      onClick={() => handleFetchRemote(remote.name)}
                      disabled={actionLoading !== null}
                    >
                      {isFetching ? <Spinner /> : null}
                      Fetch
                    </button>

                    <button
                      className="btn btn--secondary"
                      onClick={() => openSyncModal(remote, 'pull')}
                      disabled={actionLoading !== null}
                    >
                      {isPulling ? <Spinner /> : null}
                      Pull...
                    </button>

                    <button
                      className="btn btn--secondary"
                      onClick={() => openSyncModal(remote, 'push')}
                      disabled={actionLoading !== null}
                    >
                      {isPushing ? <Spinner /> : null}
                      Push...
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Add Remote Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add Git Remote</span>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleAddRemote} className={styles.style14}>
              <div className={styles.style15}>
                <label className={styles.style16}>Remote Name</label>
                <input
                  type="text"
                  placeholder="e.g. origin"
                  value={newRemoteName}
                  onChange={(e) => setNewRemoteName(e.target.value)}
                  autoFocus
                  required
                  className={styles.style17}
                />
              </div>
              <div className={styles.style18}>
                <label className={styles.style19}>Remote URL</label>
                <input
                  type="text"
                  placeholder="e.g. https://github.com/user/repo.git"
                  value={newRemoteUrl}
                  onChange={(e) => setNewRemoteUrl(e.target.value)}
                  required
                  className={styles.style20}
                />
              </div>
              <div className={styles.style21}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={actionLoading === 'add'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={actionLoading === 'add'}
                >
                  {actionLoading === 'add' ? <Spinner /> : null}
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Remote Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Edit Remote URL "{editRemoteName}"</span>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleEditRemoteSubmit} className={styles.style24}>
              <div className={styles.style25}>
                <label className={styles.style26}>Remote URL</label>
                <input
                  type="text"
                  placeholder="e.g. https://github.com/user/repo.git"
                  value={editRemoteUrl}
                  onChange={(e) => setEditRemoteUrl(e.target.value)}
                  autoFocus
                  required
                  className={styles.style27}
                />
              </div>
              <div className={styles.style28}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setShowEditModal(false)}
                  disabled={actionLoading !== null}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={actionLoading !== null}
                >
                  Save URL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Sync (Pull / Push) Modal */}
      {activeRemote && syncType && (
        <div className="modal-overlay" onClick={() => { setActiveRemote(null); setSyncType(null); }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {syncType} Branch to/from "{activeRemote.name}"
              </span>
              <button className="modal-close" onClick={() => { setActiveRemote(null); setSyncType(null); }}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSyncSubmit} className={styles.style31}>
              <div className={styles.style32}>
                <div className={styles.style33}>
                  <label className={styles.style34}>Branch Source</label>
                  <label className={styles.style35}>
                    <input
                      type="checkbox"
                      checked={useCustomBranch}
                      onChange={(e) => setUseCustomBranch(e.target.checked)}
                    />
                    Use custom branch name
                  </label>
                </div>

                {!useCustomBranch ? (
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className={styles.style36}
                  >
                    {branches
                      .filter((b) => !b.is_remote)
                      .map((branch) => (
                        <option key={branch.name} value={branch.shorthand}>
                          {branch.shorthand} {branch.is_head ? '(active)' : ''}
                        </option>
                      ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. main"
                    value={customBranch}
                    onChange={(e) => setCustomBranch(e.target.value)}
                    required
                    autoFocus
                    className={styles.style37}
                  />
                )}
              </div>

              {/* Force Push Control */}
              {syncType === 'push' && (
                <div className={styles.style38}>
                  <label className={styles.style39}>
                    <input
                      type="checkbox"
                      checked={forcePush}
                      onChange={(e) => setForcePush(e.target.checked)}
                    />
                    Force push (overwrite remote history)
                  </label>
                </div>
              )}

              <div className={styles.style40}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => { setActiveRemote(null); setSyncType(null); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary">
                  {syncType}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Git Command Output Modal */}
      {showOutputModal && (
        <div className="modal-overlay" onClick={() => setShowOutputModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{gitOutputTitle}</span>
              <button className="modal-close" onClick={() => setShowOutputModal(false)}>
                &times;
              </button>
            </div>
            <div className={styles.style44}>
              <pre className="git-output-pre">{gitOutput}</pre>
              <div className={styles.style45}>
                <button
                  className="btn btn--primary"
                  onClick={() => setShowOutputModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
