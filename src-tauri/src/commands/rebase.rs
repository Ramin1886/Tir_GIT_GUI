use crate::git;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn get_rebase_commits(
    base_commit: String,
    state: State<'_, AppState>,
) -> crate::error::Result<Vec<git::RebaseCommit>> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::get_rebase_commits(p, &base_commit)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn perform_interactive_rebase(
    base_commit: String,
    todo_list: Vec<git::RebaseCommit>,
    state: State<'_, AppState>,
) -> crate::error::Result<git::RebaseResult> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::perform_interactive_rebase(p, &base_commit, todo_list)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn rebase_continue(state: State<'_, AppState>) -> crate::error::Result<git::RebaseResult> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::rebase_continue(p)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn rebase_abort(state: State<'_, AppState>) -> crate::error::Result<()> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::rebase_abort(p)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}
