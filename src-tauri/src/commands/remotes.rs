use crate::git;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn list_remotes(state: State<'_, AppState>) -> crate::error::Result<Vec<git::RemoteInfo>> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::list_remotes(p)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn add_remote(
    name: String,
    url: String,
    state: State<'_, AppState>,
) -> crate::error::Result<()> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::add_remote(p, name, url)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn delete_remote(name: String, state: State<'_, AppState>) -> crate::error::Result<()> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::delete_remote(p, name)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn fetch_remote(name: String, state: State<'_, AppState>) -> crate::error::Result<String> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::fetch_remote(p, name)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn push_remote(
    name: String,
    branch_name: String,
    force: bool,
    state: State<'_, AppState>,
) -> crate::error::Result<String> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::push_remote(p, name, branch_name, force)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn pull_remote(
    name: String,
    branch_name: String,
    state: State<'_, AppState>,
) -> crate::error::Result<String> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::pull_remote(p, name, branch_name)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn set_remote_url(
    name: String,
    url: String,
    state: State<'_, AppState>,
) -> crate::error::Result<()> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::set_remote_url(p, name, url)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}
