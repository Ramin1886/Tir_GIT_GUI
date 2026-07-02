use git2::Repository;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SubmoduleInfo {
    pub name: String,
    pub path: String,
    pub url: String,
    pub status: String,
}

pub fn list_submodules(repo_path: &std::path::Path) -> crate::error::Result<Vec<SubmoduleInfo>> {
    let repo = Repository::open(repo_path)?;
    let mut submodules = Vec::new();

    let sms = repo.submodules()?;
    for sm in sms {
        let name = sm.name().unwrap_or("").to_string();
        let path = sm.path().to_string_lossy().to_string();
        let url = sm.url().ok().flatten().unwrap_or("").to_string();

        let status = if sm.head_id().is_none() {
            "uninitialized".to_string()
        } else {
            "initialized".to_string()
        };

        submodules.push(SubmoduleInfo {
            name,
            path,
            url,
            status,
        });
    }

    Ok(submodules)
}

pub fn init_submodules(repo_path: &std::path::Path) -> crate::error::Result<()> {
    let output = std::process::Command::new("git")
        .arg("submodule")
        .arg("init")
        .current_dir(repo_path)
        .output()?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string().into())
    }
}

pub fn update_submodules(repo_path: &std::path::Path) -> crate::error::Result<()> {
    let output = std::process::Command::new("git")
        .arg("submodule")
        .arg("update")
        .arg("--init")
        .arg("--recursive")
        .current_dir(repo_path)
        .output()?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string().into())
    }
}

pub fn sync_submodules(repo_path: &std::path::Path) -> crate::error::Result<()> {
    let output = std::process::Command::new("git")
        .arg("submodule")
        .arg("sync")
        .arg("--recursive")
        .current_dir(repo_path)
        .output()?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string().into())
    }
}

pub fn deinit_submodules(
    repo_path: &std::path::Path,
    path: Option<String>,
) -> crate::error::Result<()> {
    let mut cmd = std::process::Command::new("git");
    cmd.arg("submodule").arg("deinit");

    if let Some(p) = path {
        cmd.arg(&p);
    } else {
        cmd.arg("--all");
    }

    let output = cmd.current_dir(repo_path).output()?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string().into())
    }
}
