use super::DiffLine;
use git2::{Repository, StatusOptions};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct FileStatus {
    pub path: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkingTreeStatus {
    pub staged: Vec<FileStatus>,
    pub unstaged: Vec<FileStatus>,
    pub untracked: Vec<FileStatus>,
    pub rebase_in_progress: bool,
}

fn construct_patch(file_path: &str, hunk_header: &str, lines: &[DiffLine]) -> String {
    let mut patch = format!(
        "diff --git a/{path} b/{path}\n--- a/{path}\n+++ b/{path}\n{header}\n",
        path = file_path,
        header = hunk_header
    );
    for line in lines {
        patch.push(line.origin);
        patch.push_str(&line.content);
        if !line.content.ends_with('\n') {
            patch.push('\n');
        }
    }
    patch
}

fn apply_patch(
    repo_path: &std::path::Path,
    patch_content: &str,
    extra_args: &[&str],
) -> crate::error::Result<()> {
    use std::io::Write;
    let mut child = std::process::Command::new("git")
        .arg("apply")
        .args(extra_args)
        .arg("-")
        .current_dir(repo_path)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(patch_content.as_bytes())?;
    }

    let output = child.wait_with_output()?;
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string().into())
    }
}

pub fn get_status(repo_path: &std::path::Path) -> crate::error::Result<WorkingTreeStatus> {
    let repo = Repository::open(repo_path)?;
    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    opts.renames_head_to_index(true);
    opts.renames_index_to_workdir(true);
    let statuses = repo.statuses(Some(&mut opts))?;

    let mut staged = Vec::new();
    let mut unstaged = Vec::new();
    let mut untracked = Vec::new();

    for entry in statuses.iter() {
        let status = entry.status();
        let path = entry.path().unwrap_or("").to_string();

        if status.contains(git2::Status::CONFLICTED) {
            unstaged.push(FileStatus {
                path: path.clone(),
                status: "U".to_string(),
            });
            continue;
        }

        if status.is_index_new()
            || status.is_index_modified()
            || status.is_index_deleted()
            || status.is_index_renamed()
            || status.is_index_typechange()
        {
            let mut s = String::new();
            if status.is_index_new() {
                s.push('A');
            }
            if status.is_index_modified() {
                s.push('M');
            }
            if status.is_index_deleted() {
                s.push('D');
            }
            if status.is_index_renamed() {
                s.push('R');
            }
            staged.push(FileStatus {
                path: path.clone(),
                status: s,
            });
        }

        if status.is_wt_new() {
            untracked.push(FileStatus {
                path: path.clone(),
                status: "??".to_string(),
            });
        } else if status.is_wt_modified()
            || status.is_wt_deleted()
            || status.is_wt_typechange()
            || status.is_wt_renamed()
        {
            let mut s = String::new();
            if status.is_wt_modified() {
                s.push('M');
            }
            if status.is_wt_deleted() {
                s.push('D');
            }
            if status.is_wt_renamed() {
                s.push('R');
            }
            unstaged.push(FileStatus { path, status: s });
        }
    }

    let rebase_in_progress = repo_path.join(".git/rebase-merge").exists()
        || repo_path.join(".git/rebase-apply").exists();
    Ok(WorkingTreeStatus {
        staged,
        unstaged,
        untracked,
        rebase_in_progress,
    })
}

pub fn stage_file(repo_path: &std::path::Path, file_path: String) -> crate::error::Result<()> {
    let repo = Repository::open(repo_path)?;
    let mut index = repo.index()?;
    index.add_path(std::path::Path::new(&file_path))?;
    index.write()?;
    Ok(())
}

pub fn unstage_file(repo_path: &std::path::Path, file_path: String) -> crate::error::Result<()> {
    let repo = Repository::open(repo_path)?;
    let head = repo.head().ok();
    if let Some(h) = head {
        let obj = h.peel(git2::ObjectType::Any)?;
        repo.reset_default(Some(&obj), [&file_path])?;
    } else {
        let mut index = repo.index()?;
        index.remove_path(std::path::Path::new(&file_path))?;
        index.write()?;
    }
    Ok(())
}

pub fn discard_file_changes(
    repo_path: &std::path::Path,
    file_path: String,
) -> crate::error::Result<()> {
    let repo = Repository::open(repo_path)?;
    let status_flags = repo.status_file(std::path::Path::new(&file_path))?;
    if status_flags.contains(git2::Status::WT_NEW) {
        let full_path = repo_path.join(&file_path);
        if full_path.exists() {
            std::fs::remove_file(full_path)?;
        }
    } else {
        let mut checkout_opts = git2::build::CheckoutBuilder::new();
        checkout_opts.path(&file_path);
        checkout_opts.force();
        repo.checkout_index(None, Some(&mut checkout_opts))?;
    }
    Ok(())
}

pub fn stage_all_files(repo_path: &std::path::Path) -> crate::error::Result<()> {
    let repo = Repository::open(repo_path)?;
    let mut index = repo.index()?;
    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)?;
    index.write()?;
    Ok(())
}

pub fn unstage_all_files(repo_path: &std::path::Path) -> crate::error::Result<()> {
    let repo = Repository::open(repo_path)?;
    let head = repo.head().ok();
    if let Some(h) = head {
        let commit = h.peel_to_commit()?;
        let obj = commit.into_object();
        repo.reset(&obj, git2::ResetType::Mixed, None)?;
    } else {
        let mut index = repo.index()?;
        index.clear()?;
        index.write()?;
    }
    Ok(())
}

pub fn stage_hunk(
    repo_path: &std::path::Path,
    file_path: String,
    hunk_header: String,
    lines: Vec<DiffLine>,
) -> crate::error::Result<()> {
    let patch = construct_patch(&file_path, &hunk_header, &lines);
    apply_patch(repo_path, &patch, &["--cached", "--unidiff-zero"])
}

pub fn unstage_hunk(
    repo_path: &std::path::Path,
    file_path: String,
    hunk_header: String,
    lines: Vec<DiffLine>,
) -> crate::error::Result<()> {
    let patch = construct_patch(&file_path, &hunk_header, &lines);
    apply_patch(
        repo_path,
        &patch,
        &["--cached", "--reverse", "--unidiff-zero"],
    )
}

pub fn discard_hunk(
    repo_path: &std::path::Path,
    file_path: String,
    hunk_header: String,
    lines: Vec<DiffLine>,
) -> crate::error::Result<()> {
    let patch = construct_patch(&file_path, &hunk_header, &lines);
    apply_patch(repo_path, &patch, &["--reverse", "--unidiff-zero"])
}

pub fn apply_custom_patch(
    repo_path: &std::path::Path,
    patch: &str,
    extra_args: &[&str],
) -> crate::error::Result<()> {
    apply_patch(repo_path, patch, extra_args)
}
