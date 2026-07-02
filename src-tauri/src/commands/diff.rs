use crate::git;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn get_diff(
    path: String,
    commit_id: Option<String>,
    staged: bool,
    state: State<'_, AppState>,
) -> crate::error::Result<git::FileDiff> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::get_diff(p, path, commit_id, staged)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}
