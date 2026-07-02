use crate::git;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn get_blame(
    file_path: String,
    commit_id: Option<String>,
    state: State<'_, AppState>,
) -> crate::error::Result<Vec<git::BlameLine>> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::get_blame(p, &file_path, commit_id)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}
