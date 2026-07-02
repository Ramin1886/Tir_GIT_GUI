use crate::git;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn lfs_track_patterns(
    patterns: Vec<String>,
    state: State<'_, AppState>,
) -> crate::error::Result<()> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::lfs::track_patterns(p, patterns)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn lfs_list_tracked_patterns(state: State<'_, AppState>) -> crate::error::Result<Vec<String>> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::lfs::list_tracked_patterns(p)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn lfs_list_locks(
    state: State<'_, AppState>,
) -> crate::error::Result<Vec<git::lfs::LfsLockInfo>> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::lfs::list_locks(p)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn lfs_push(
    remote: String,
    branch: String,
    state: State<'_, AppState>,
) -> crate::error::Result<String> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::lfs::push_lfs(p, &remote, &branch)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}
