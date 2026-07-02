use crate::git;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn list_submodules(
    state: State<'_, AppState>,
) -> crate::error::Result<Vec<git::SubmoduleInfo>> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::list_submodules(p)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn init_submodules(state: State<'_, AppState>) -> crate::error::Result<()> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::init_submodules(p)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn update_submodules(state: State<'_, AppState>) -> crate::error::Result<()> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::update_submodules(p)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}
