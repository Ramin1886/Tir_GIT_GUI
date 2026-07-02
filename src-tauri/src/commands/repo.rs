use crate::git;
use crate::state::AppState;
use tauri::State;

use std::path::PathBuf;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct GitHook {
    name: String,
    content: String,
    exists: bool,
}

#[tauri::command]
pub fn open_repository(path: String, state: State<'_, AppState>) -> crate::error::Result<()> {
    let repo_path = PathBuf::from(path);
    // Verify it's a valid git repository
    let _ = git2::Repository::open(&repo_path)?;

    let mut state_repo_path = state.repo_path.lock().unwrap();
    *state_repo_path = Some(repo_path);

    Ok(())
}

#[tauri::command]
pub fn run_git_command(
    args: Vec<String>,
    state: State<'_, AppState>,
) -> crate::error::Result<String> {
    if args.is_empty() {
        return Err(crate::error::GitError::CommandFailed(
            "No git command provided".to_string(),
        ));
    }

    let subcommand = args[0].as_str();
    let allowed_subcommands = [
        "merge", "rebase", "config", "flow", "checkout", "branch", "tag", "fetch", "lfs",
    ];

    if !allowed_subcommands.contains(&subcommand) {
        return Err(crate::error::GitError::CommandFailed(format!(
            "Git subcommand '{}' is not allowed for security reasons",
            subcommand
        )));
    }

    // Security: Prevent overriding dangerous config keys
    if subcommand == "config" {
        for arg in &args[1..] {
            let lower_arg = arg.to_lowercase();
            if lower_arg.contains("core.sshcommand")
                || lower_arg.contains("core.pager")
                || lower_arg.contains("core.editor")
                || lower_arg.contains("alias.")
            {
                return Err(crate::error::GitError::CommandFailed(
                    "Modifying sensitive git config keys is not permitted".to_string(),
                ));
            }
        }
    }

    // Security: Prevent executing scripts via merge/rebase
    for arg in &args {
        if arg.starts_with("--exec") || arg.starts_with("-x") {
            return Err(crate::error::GitError::CommandFailed(
                "Execution flags are not permitted".to_string(),
            ));
        }
    }

    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        let output = std::process::Command::new("git")
            .args(&args)
            .current_dir(p)
            .output()?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        if output.status.success() {
            Ok(stdout)
        } else {
            Err((if stderr.is_empty() { stdout } else { stderr }).into())
        }
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn list_git_hooks(state: State<'_, AppState>) -> crate::error::Result<Vec<GitHook>> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        let hooks_dir = p.join(".git").join("hooks");
        let hook_names = vec![
            "pre-commit",
            "prepare-commit-msg",
            "commit-msg",
            "post-commit",
            "pre-rebase",
            "post-checkout",
            "post-merge",
            "pre-push",
        ];
        let mut result = Vec::new();

        for name in hook_names {
            let hook_path = hooks_dir.join(name);
            let exists = hook_path.exists();
            let content = if exists {
                std::fs::read_to_string(&hook_path).unwrap_or_default()
            } else {
                let sample_path = hooks_dir.join(format!("{}.sample", name));
                if sample_path.exists() {
                    std::fs::read_to_string(&sample_path).unwrap_or_default()
                } else {
                    String::new()
                }
            };

            result.push(GitHook {
                name: name.to_string(),
                content,
                exists,
            });
        }
        Ok(result)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn save_git_hook(
    name: String,
    content: String,
    state: State<'_, AppState>,
) -> crate::error::Result<()> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        let hooks_dir = p.join(".git").join("hooks");
        if !hooks_dir.exists() {
            std::fs::create_dir_all(&hooks_dir)?;
        }
        if name.contains('/') || name.contains('\\') || name.contains("..") {
            return Err(crate::error::GitError::CommandFailed(
                "Invalid hook name".to_string(),
            ));
        }
        let hook_path = hooks_dir.join(&name);
        std::fs::write(&hook_path, content)?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = std::fs::metadata(&hook_path)?.permissions();
            perms.set_mode(0o755);
            std::fs::set_permissions(&hook_path, perms)?;
        }
        Ok(())
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn delete_git_hook(name: String, state: State<'_, AppState>) -> crate::error::Result<()> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        if name.contains('/') || name.contains('\\') || name.contains("..") {
            return Err(crate::error::GitError::CommandFailed(
                "Invalid hook name".to_string(),
            ));
        }
        let hook_path = p.join(".git").join("hooks").join(name);
        if hook_path.exists() {
            std::fs::remove_file(hook_path)?;
        }
        Ok(())
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn check_merge_conflicts(
    base: String,
    head: String,
    state: State<'_, AppState>,
) -> crate::error::Result<Vec<String>> {
    let repo_path = state.repo_path.lock().unwrap();
    if let Some(p) = repo_path.as_ref() {
        git::check_merge_conflicts(p, &base, &head)
    } else {
        Err(crate::error::GitError::CommandFailed(
            "No repository is currently open.".to_string(),
        ))
    }
}

#[tauri::command]
pub fn clone_repository(url: String, target_path: String) -> crate::error::Result<()> {
    if url.starts_with("--") || target_path.starts_with("--") {
        return Err(crate::error::GitError::CommandFailed(
            "Invalid arguments for clone".to_string(),
        ));
    }
    let output = std::process::Command::new("git")
        .arg("clone")
        .arg("--")
        .arg(&url)
        .arg(&target_path)
        .output()?;
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string().into())
    }
}

#[tauri::command]
pub fn get_repo_summary(path: String) -> crate::error::Result<git::RepoSummary> {
    let p = std::path::PathBuf::from(path);
    git::get_repo_summary(&p)
}
