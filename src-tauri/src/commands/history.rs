use git2::Repository;

use crate::git;
use crate::state::AppState;
use tauri::State;

use crate::encode_base64;

#[tauri::command]
pub fn get_history(
    state: State<'_, AppState>,
    limit: usize,
    skip: Option<usize>,
    filter_path: Option<String>,
    filter_content: Option<String>,
) -> crate::error::Result<Vec<git::CommitInfo>> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(path) = repo_path.as_deref() {
        git::get_history(path, limit, skip, filter_path, filter_content)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn get_commit_details(
    commit_id: String,
    state: State<'_, AppState>,
) -> crate::error::Result<git::CommitDetails> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::get_commit_details(p, commit_id)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn get_commit_template(state: State<'_, AppState>) -> crate::error::Result<Option<String>> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::get_commit_template(p)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn create_commit(
    message: String,
    amend: bool,
    state: State<'_, AppState>,
) -> crate::error::Result<String> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::create_commit(p, message, amend)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn cherry_pick(commit_id: String, state: State<'_, AppState>) -> crate::error::Result<()> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::cherry_pick(p, commit_id)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn revert_commit(commit_id: String, state: State<'_, AppState>) -> crate::error::Result<()> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::revert_commit(p, commit_id)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn get_parent_commit_id(
    commit_id: String,
    state: State<'_, AppState>,
) -> crate::error::Result<Option<String>> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        let repo = Repository::open(p)?;
        let oid = git2::Oid::from_str(&commit_id)?;
        let commit = repo.find_commit(oid)?;
        if commit.parent_count() > 0 {
            Ok(Some(commit.parent_id(0)?.to_string()))
        } else {
            Ok(None)
        }
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn get_file_content_at_commit(
    commit_id: Option<String>,
    file_path: String,
    state: State<'_, AppState>,
) -> crate::error::Result<String> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        let repo = Repository::open(p)?;

        let object_spec = if let Some(ref cid) = commit_id {
            format!("{}:{}", cid, file_path)
        } else {
            format!("HEAD:{}", file_path)
        };

        let object = repo.revparse_single(&object_spec)?;
        let blob = object.as_blob().ok_or("Object is not a blob")?;

        Ok(encode_base64(blob.content()))
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}
