use git2::Repository;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct RemoteInfo {
    pub name: String,
    pub url: Option<String>,
    pub push_url: Option<String>,
}

pub fn list_remotes(repo_path: &std::path::Path) -> crate::error::Result<Vec<RemoteInfo>> {
    let repo = Repository::open(repo_path)?;
    let mut remotes_list = Vec::new();

    let remotes = repo.remotes()?;
    for name_opt in remotes.iter() {
        if let Ok(Some(name)) = name_opt {
            if let Ok(remote) = repo.find_remote(name) {
                let url = remote.url().ok().map(|u| u.to_string());
                let push_url = remote.pushurl().ok().flatten().map(|u| u.to_string());

                remotes_list.push(RemoteInfo {
                    name: name.to_string(),
                    url,
                    push_url,
                });
            }
        }
    }

    Ok(remotes_list)
}

pub fn add_remote(
    repo_path: &std::path::Path,
    name: String,
    url: String,
) -> crate::error::Result<()> {
    let repo = Repository::open(repo_path)?;
    let _remote = repo.remote(&name, &url)?;
    Ok(())
}

pub fn delete_remote(repo_path: &std::path::Path, name: String) -> crate::error::Result<()> {
    let repo = Repository::open(repo_path)?;
    repo.remote_delete(&name)?;
    Ok(())
}

pub fn fetch_remote(repo_path: &std::path::Path, name: String) -> crate::error::Result<String> {
    let output = std::process::Command::new("git")
        .arg("fetch")
        .arg(&name)
        .current_dir(repo_path)
        .output()?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stderr).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string().into())
    }
}

pub fn push_remote(
    repo_path: &std::path::Path,
    name: String,
    branch_name: String,
    force: bool,
) -> crate::error::Result<String> {
    let mut cmd = std::process::Command::new("git");
    cmd.arg("push");
    if force {
        cmd.arg("--force");
    }
    cmd.arg(&name).arg(&branch_name).current_dir(repo_path);

    let output = cmd.output()?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stderr).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string().into())
    }
}

pub fn pull_remote(
    repo_path: &std::path::Path,
    name: String,
    branch_name: String,
) -> crate::error::Result<String> {
    let output = std::process::Command::new("git")
        .arg("pull")
        .arg(&name)
        .arg(&branch_name)
        .current_dir(repo_path)
        .output()?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string().into())
    }
}

pub fn set_remote_url(
    repo_path: &std::path::Path,
    name: String,
    url: String,
) -> crate::error::Result<()> {
    let repo = Repository::open(repo_path)?;
    repo.remote_set_url(&name, &url)?;
    Ok(())
}
