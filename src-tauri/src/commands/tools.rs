use crate::git;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn load_tools_config() -> crate::error::Result<git::ToolsConfig> {
    git::load_tools_config()
}

#[tauri::command]
pub fn save_tools_config(config: git::ToolsConfig) -> crate::error::Result<()> {
    git::save_tools_config(&config)
}

#[tauri::command]
pub fn detect_installed_tools() -> crate::error::Result<git::ToolsConfig> {
    git::detect_installed_tools()
}

#[tauri::command]
pub fn launch_external_diff(
    file_path: String,
    state: State<'_, AppState>,
) -> crate::error::Result<()> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::launch_external_diff(p, file_path)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn launch_external_merge(
    file_path: String,
    state: State<'_, AppState>,
) -> crate::error::Result<()> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::launch_external_merge(p, file_path)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn test_tool_command(command_str: String) -> crate::error::Result<()> {
    git::test_tool_command(command_str)
}
