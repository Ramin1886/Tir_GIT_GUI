use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct LfsLockInfo {
    pub id: String,
    pub path: String,
    pub owner: Option<LfsOwnerInfo>,
    pub locked_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LfsOwnerInfo {
    pub name: String,
}

/// Track a new pattern in Git LFS
pub fn track_patterns(
    repo_path: &std::path::Path,
    patterns: Vec<String>,
) -> crate::error::Result<()> {
    for pattern in patterns {
        let output = std::process::Command::new("git")
            .arg("lfs")
            .arg("track")
            .arg(&pattern)
            .current_dir(repo_path)
            .output()?;

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string().into());
        }
    }
    Ok(())
}

/// List currently tracked LFS patterns
pub fn list_tracked_patterns(repo_path: &std::path::Path) -> crate::error::Result<Vec<String>> {
    let output = std::process::Command::new("git")
        .arg("lfs")
        .arg("track")
        .current_dir(repo_path)
        .output()?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut patterns = Vec::new();
        // `git lfs track` typically outputs lines like: "Listing tracked patterns\n    *.psd (.gitattributes)"
        for line in stdout.lines() {
            let line = line.trim();
            if line.starts_with("Listing tracked patterns") || line.is_empty() {
                continue;
            }
            // Extract the pattern part (before the parenthesis)
            if let Some(space_idx) = line.find(" (") {
                patterns.push(line[..space_idx].to_string());
            } else {
                patterns.push(line.to_string());
            }
        }
        Ok(patterns)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string().into())
    }
}

/// List active LFS locks
pub fn list_locks(repo_path: &std::path::Path) -> crate::error::Result<Vec<LfsLockInfo>> {
    let output = std::process::Command::new("git")
        .arg("lfs")
        .arg("locks")
        .arg("--json")
        .current_dir(repo_path)
        .output()?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if stdout.trim().is_empty() {
            return Ok(Vec::new());
        }

        let locks: Vec<LfsLockInfo> = match serde_json::from_str(&stdout) {
            Ok(l) => l,
            Err(_) => Vec::new(), // If it's empty or invalid json, return empty locks
        };
        Ok(locks)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string().into())
    }
}

/// Push LFS assets to origin
pub fn push_lfs(
    repo_path: &std::path::Path,
    remote: &str,
    branch: &str,
) -> crate::error::Result<String> {
    let output = std::process::Command::new("git")
        .arg("lfs")
        .arg("push")
        .arg(remote)
        .arg(branch)
        .current_dir(repo_path)
        .output()?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string().into())
    }
}
