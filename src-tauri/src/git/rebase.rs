use git2::Repository;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RebaseCommit {
    pub id: String,
    pub author: String,
    pub message: String,
    pub action: String, // pick, squash, fixup, edit, drop, reword
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RebaseResult {
    pub success: bool,
    pub status: String, // "completed", "conflicts", "error"
    pub message: String,
}

pub fn get_rebase_commits(
    repo_path: &std::path::Path,
    base_commit: &str,
) -> crate::error::Result<Vec<RebaseCommit>> {
    let repo = Repository::open(repo_path)?;
    let mut revwalk = repo.revwalk()?;
    revwalk.set_sorting(git2::Sort::REVERSE | git2::Sort::TOPOLOGICAL)?;

    let base_oid = git2::Oid::from_str(base_commit)?;
    let head_oid = repo
        .head()?
        .target()
        .ok_or_else(|| "HEAD is not a direct reference".to_string())?;

    revwalk.push(head_oid)?;
    revwalk.hide(base_oid)?;

    let mut commits = Vec::new();
    for oid_res in revwalk {
        let oid = oid_res?;
        let commit = repo.find_commit(oid)?;
        commits.push(RebaseCommit {
            id: oid.to_string(),
            author: commit.author().name().unwrap_or("").to_string(),
            message: commit.summary().unwrap_or(None).unwrap_or("").to_string(),
            action: "pick".to_string(),
        });
    }

    Ok(commits)
}

pub fn perform_interactive_rebase(
    repo_path: &std::path::Path,
    base_commit: &str,
    todo_list: Vec<RebaseCommit>,
) -> crate::error::Result<RebaseResult> {
    let git_dir = repo_path.join(".git");
    let todo_input_path = git_dir.join("rebase-todo-input");

    let mut todo_content = String::new();
    for commit in todo_list {
        todo_content.push_str(&format!(
            "{} {} {}\n",
            commit.action, commit.id, commit.message
        ));
    }

    std::fs::write(&todo_input_path, todo_content)?;

    let sequence_editor = format!("cp {}", todo_input_path.to_string_lossy());

    let output = std::process::Command::new("git")
        .arg("rebase")
        .arg("-i")
        .arg(base_commit)
        .env("GIT_SEQUENCE_EDITOR", &sequence_editor)
        .env("GIT_EDITOR", "true")
        .current_dir(repo_path)
        .output()?;

    let _ = std::fs::remove_file(&todo_input_path);

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(RebaseResult {
            success: true,
            status: "completed".to_string(),
            message: stdout,
        })
    } else {
        let rebase_merge_exists = repo_path.join(".git/rebase-merge").exists()
            || repo_path.join(".git/rebase-apply").exists();
        if rebase_merge_exists {
            Ok(RebaseResult {
                success: false,
                status: "conflicts".to_string(),
                message: format!(
                    "Rebase paused due to conflicts. Please resolve conflicts and continue.\n\n{}",
                    stderr
                ),
            })
        } else {
            Ok(RebaseResult {
                success: false,
                status: "error".to_string(),
                message: format!("Rebase failed to start:\n{}", stderr),
            })
        }
    }
}

pub fn rebase_continue(repo_path: &std::path::Path) -> crate::error::Result<RebaseResult> {
    let output = std::process::Command::new("git")
        .arg("rebase")
        .arg("--continue")
        .env("GIT_EDITOR", "true")
        .current_dir(repo_path)
        .output()?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(RebaseResult {
            success: true,
            status: "completed".to_string(),
            message: stdout,
        })
    } else {
        let rebase_merge_exists = repo_path.join(".git/rebase-merge").exists()
            || repo_path.join(".git/rebase-apply").exists();
        if rebase_merge_exists {
            Ok(RebaseResult {
                success: false,
                status: "conflicts".to_string(),
                message: format!(
                    "More conflicts encountered. Please resolve them.\n\n{}",
                    stderr
                ),
            })
        } else {
            Ok(RebaseResult {
                success: false,
                status: "error".to_string(),
                message: format!("Rebase continue failed:\n{}", stderr),
            })
        }
    }
}

pub fn rebase_abort(repo_path: &std::path::Path) -> crate::error::Result<()> {
    let output = std::process::Command::new("git")
        .arg("rebase")
        .arg("--abort")
        .current_dir(repo_path)
        .output()?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string().into())
    }
}
