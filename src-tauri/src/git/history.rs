use git2::Repository;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CommitInfo {
    pub id: String,
    pub author: String,
    pub email: String,
    pub message: String,
    pub time: i64,
    pub parents: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommitDetails {
    pub id: String,
    pub author: String,
    pub email: String,
    pub message: String,
    pub time: i64,
    pub files: Vec<String>,
}

pub fn get_history(
    repo_path: &std::path::Path,
    limit: usize,
    skip: Option<usize>,
    filter_path: Option<String>,
    filter_content: Option<String>,
    filter_author: Option<String>,
    filter_date_from: Option<i64>,
    filter_date_to: Option<i64>,
) -> crate::error::Result<Vec<CommitInfo>> {
    let repo = Repository::open(repo_path)?;
    let mut revwalk = repo.revwalk()?;

    // Attempt to push HEAD; if it fails (e.g. empty repository), return empty history list.
    if revwalk.push_head().is_err() {
        return Ok(Vec::new());
    }

    let mut commits = Vec::new();

    let mut diff_opts = git2::DiffOptions::new();
    let has_path_filter = if let Some(ref path) = filter_path {
        if !path.trim().is_empty() {
            diff_opts.pathspec(path.trim());
            true
        } else {
            false
        }
    } else {
        false
    };

    let has_content_filter = if let Some(ref content) = filter_content {
        !content.trim().is_empty()
    } else {
        false
    };

    let mut matching_shas = std::collections::HashSet::new();
    if has_content_filter {
        let query = filter_content.as_ref().unwrap().trim();
        let output = std::process::Command::new("git")
            .args(["log", "-S", query, "--format=%H"])
            .current_dir(repo_path)
            .output()?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            if !line.trim().is_empty() {
                matching_shas.insert(line.trim().to_string());
            }
        }
    }

    let mut skipped_count = 0;

    for id in revwalk {
        let id = id?;
        let commit = repo.find_commit(id)?;

        // Author filtering logic
        if let Some(ref author) = filter_author {
            if !author.trim().is_empty() {
                let author_lower = author.to_lowercase();
                let commit_author_name = commit.author().name().unwrap_or("").to_lowercase();
                let commit_author_email = commit.author().email().unwrap_or("").to_lowercase();
                if !commit_author_name.contains(&author_lower)
                    && !commit_author_email.contains(&author_lower)
                {
                    continue;
                }
            }
        }

        // Date filtering logic
        let commit_time = commit.time().seconds();
        if let Some(from) = filter_date_from {
            if commit_time < from {
                continue;
            }
        }
        if let Some(to) = filter_date_to {
            if commit_time > to {
                continue;
            }
        }

        // Content filtering logic
        if has_content_filter && !matching_shas.contains(&id.to_string()) {
            continue;
        }

        // Path filtering logic
        if has_path_filter {
            let diff = crate::git::utils::get_commit_diff(&repo, &commit, Some(&mut diff_opts))?;
            if diff.deltas().len() == 0 {
                continue; // Skip this commit as it doesn't modify the path
            }
        }

        if let Some(s) = skip {
            if skipped_count < s {
                skipped_count += 1;
                continue;
            }
        }

        let parents = commit.parent_ids().map(|pid| pid.to_string()).collect();

        commits.push(CommitInfo {
            id: commit.id().to_string(),
            author: commit.author().name().unwrap_or("Unknown").to_string(),
            email: commit.author().email().unwrap_or("").to_string(),
            message: commit.summary().unwrap_or(None).unwrap_or("").to_string(),
            time: commit.time().seconds(),
            parents,
        });

        if commits.len() >= limit {
            break;
        }
    }

    Ok(commits)
}

pub fn get_commit_details(
    repo_path: &std::path::Path,
    commit_id: String,
) -> crate::error::Result<CommitDetails> {
    let repo = Repository::open(repo_path)?;
    let oid = git2::Oid::from_str(&commit_id)?;
    let commit = repo.find_commit(oid)?;

    let diff = crate::git::utils::get_commit_diff(&repo, &commit, None)?;

    let mut files = Vec::new();
    diff.foreach(
        &mut |delta, _| {
            if let Some(new_file) = delta.new_file().path() {
                if let Some(path_str) = new_file.to_str() {
                    files.push(path_str.to_string());
                }
            }
            true
        },
        None,
        None,
        None,
    )?;

    let author_sig = commit.author();
    let author_name = author_sig.name().unwrap_or("Unknown").to_string();
    let author_email = author_sig.email().unwrap_or("").to_string();
    let message = commit.message().unwrap_or("").to_string();

    Ok(CommitDetails {
        id: commit.id().to_string(),
        author: author_name,
        email: author_email,
        message,
        time: commit.time().seconds(),
        files,
    })
}

pub fn create_commit(
    repo_path: &std::path::Path,
    message: String,
    amend: bool,
) -> crate::error::Result<String> {
    let mut cmd = std::process::Command::new("git");
    cmd.arg("commit");
    if amend {
        cmd.arg("--amend");
    }
    cmd.arg("-m").arg(&message);
    cmd.current_dir(repo_path);

    let output = cmd.output()?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string().into())
    }
}

pub fn get_commit_template(repo_path: &std::path::Path) -> crate::error::Result<Option<String>> {
    let repo = Repository::open(repo_path)?;

    // 1. Check local file .gitmessage at repo root
    let local_template = repo_path.join(".gitmessage");
    if local_template.exists() && local_template.is_file() {
        if let Ok(content) = std::fs::read_to_string(local_template) {
            return Ok(Some(content));
        }
    }

    // 2. Check git config `commit.template`
    if let Ok(config) = repo.config() {
        if let Ok(template_path_str) = config.get_string("commit.template") {
            let template_path = std::path::Path::new(&template_path_str);
            if template_path.exists() && template_path.is_file() {
                if let Ok(content) = std::fs::read_to_string(template_path) {
                    return Ok(Some(content));
                }
            }
        }
    }

    Ok(None)
}

pub fn cherry_pick(repo_path: &std::path::Path, commit_id: String) -> crate::error::Result<()> {
    let output = std::process::Command::new("git")
        .arg("cherry-pick")
        .arg(&commit_id)
        .current_dir(repo_path)
        .output()?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string().into())
    }
}

pub fn revert_commit(repo_path: &std::path::Path, commit_id: String) -> crate::error::Result<()> {
    let output = std::process::Command::new("git")
        .arg("revert")
        .arg("--no-edit")
        .arg(&commit_id)
        .current_dir(repo_path)
        .output()?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string().into())
    }
}
