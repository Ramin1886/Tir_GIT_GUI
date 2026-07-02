use git2::Repository;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct BranchInfo {
    pub name: String,
    pub shorthand: String,
    pub is_head: bool,
    pub is_remote: bool,
    pub upstream: Option<String>,
    pub ahead: Option<usize>,
    pub behind: Option<usize>,
    pub target_commit: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BranchComparisonFile {
    pub path: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BranchComparison {
    pub ahead: usize,
    pub behind: usize,
    pub files: Vec<BranchComparisonFile>,
}

pub fn list_branches(repo_path: &std::path::Path) -> crate::error::Result<Vec<BranchInfo>> {
    let repo = Repository::open(repo_path)?;
    let mut branches_list = Vec::new();

    let branches = repo.branches(None)?;

    for entry in branches {
        let (branch, branch_type) = entry?;
        let shorthand = branch.get().shorthand().unwrap_or("").to_string();
        let name = branch.name()?.unwrap_or("").to_string();
        let is_head = branch.is_head();
        let is_remote = branch_type == git2::BranchType::Remote;
        let target_commit = branch
            .get()
            .peel_to_commit()
            .map(|c| c.id().to_string())
            .ok();

        let mut upstream = None;
        let mut ahead = None;
        let mut behind = None;

        if branch_type == git2::BranchType::Local {
            if let Ok(upstream_branch) = branch.upstream() {
                if let Ok(Some(up_name)) = upstream_branch.name() {
                    upstream = Some(up_name.to_string());
                }

                if let (Ok(local_commit), Ok(upstream_commit)) = (
                    branch.get().peel_to_commit(),
                    upstream_branch.get().peel_to_commit(),
                ) {
                    if let Ok((ah, bh)) =
                        repo.graph_ahead_behind(local_commit.id(), upstream_commit.id())
                    {
                        ahead = Some(ah);
                        behind = Some(bh);
                    }
                }
            }
        }

        branches_list.push(BranchInfo {
            name,
            shorthand,
            is_head,
            is_remote,
            upstream,
            ahead,
            behind,
            target_commit,
        });
    }

    Ok(branches_list)
}

pub fn checkout_branch(
    repo_path: &std::path::Path,
    branch_name: String,
    force: bool,
) -> crate::error::Result<()> {
    let repo = Repository::open(repo_path)?;

    let branch = if let Some(shorthand) = branch_name.strip_prefix("refs/heads/") {
        repo.find_branch(shorthand, git2::BranchType::Local)
    } else if let Some(shorthand) = branch_name.strip_prefix("refs/remotes/") {
        repo.find_branch(shorthand, git2::BranchType::Remote)
    } else {
        repo.find_branch(&branch_name, git2::BranchType::Local)
            .or_else(|_| repo.find_branch(&branch_name, git2::BranchType::Remote))
    }?;

    let is_remote = branch.get().is_remote();

    let mut opts = git2::build::CheckoutBuilder::new();
    if force {
        opts.force();
    } else {
        opts.safe();
    }

    if is_remote {
        let shorthand = branch.name().ok().flatten().unwrap_or_default();
        let local_shorthand = if let Some(idx) = shorthand.find('/') {
            &shorthand[idx + 1..]
        } else {
            shorthand
        };

        if let Ok(local_br) = repo.find_branch(local_shorthand, git2::BranchType::Local) {
            let ref_name = local_br.get().name()?.to_string();
            let obj = local_br.get().peel(git2::ObjectType::Any)?;
            repo.checkout_tree(&obj, Some(&mut opts))?;
            repo.set_head(&ref_name)?;
        } else {
            let obj = branch.get().peel(git2::ObjectType::Any)?;
            let commit = obj.as_commit().ok_or("Remote reference is not a commit")?;
            let mut local_br = repo.branch(local_shorthand, commit, false)?;
            local_br.set_upstream(Some(shorthand))?;

            let ref_name = local_br.get().name()?.to_string();
            repo.checkout_tree(&obj, Some(&mut opts))?;
            repo.set_head(&ref_name)?;
        }
    } else {
        let ref_name = branch.get().name()?.to_string();
        let obj = branch.get().peel(git2::ObjectType::Any)?;
        repo.checkout_tree(&obj, Some(&mut opts))?;
        repo.set_head(&ref_name)?;
    }

    Ok(())
}

pub fn create_branch(
    repo_path: &std::path::Path,
    branch_name: String,
    start_point: Option<String>,
) -> crate::error::Result<()> {
    let repo = Repository::open(repo_path)?;

    let commit = if let Some(ref sp) = start_point {
        let obj = repo.revparse_single(sp)?;
        obj.peel_to_commit()?
    } else {
        let head = repo.head()?;
        let obj = head.peel(git2::ObjectType::Commit)?;
        obj.peel_to_commit()?
    };

    let _branch = repo.branch(&branch_name, &commit, false)?;

    Ok(())
}

pub fn delete_branch(repo_path: &std::path::Path, branch_name: String) -> crate::error::Result<()> {
    let repo = Repository::open(repo_path)?;

    let mut branch = repo.find_branch(&branch_name, git2::BranchType::Local)?;
    branch.delete()?;

    Ok(())
}

pub fn rename_branch(
    repo_path: &std::path::Path,
    old_name: String,
    new_name: String,
) -> crate::error::Result<()> {
    let repo = Repository::open(repo_path)?;
    let mut branch = repo.find_branch(&old_name, git2::BranchType::Local)?;
    branch.rename(&new_name, false)?;
    Ok(())
}

pub fn delete_remote_branch(
    repo_path: &std::path::Path,
    remote_name: String,
    branch_name: String,
) -> crate::error::Result<String> {
    let output = std::process::Command::new("git")
        .arg("push")
        .arg(&remote_name)
        .arg("--delete")
        .arg(&branch_name)
        .current_dir(repo_path)
        .output()?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stderr).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string().into())
    }
}

pub fn compare_branches(
    repo_path: &std::path::Path,
    branch_a: String,
    branch_b: String,
) -> crate::error::Result<BranchComparison> {
    let repo = Repository::open(repo_path)?;

    // Find commit for branch_a
    let obj_a = repo.revparse_single(&branch_a)?;
    let commit_a = obj_a.peel_to_commit()?;

    // Find commit for branch_b
    let obj_b = repo.revparse_single(&branch_b)?;
    let commit_b = obj_b.peel_to_commit()?;

    let (ahead, behind) = repo.graph_ahead_behind(commit_a.id(), commit_b.id())?;

    let tree_a = commit_a.tree()?;
    let tree_b = commit_b.tree()?;

    let diff = repo.diff_tree_to_tree(Some(&tree_b), Some(&tree_a), None)?;

    let mut files = Vec::new();
    diff.foreach(
        &mut |delta, _| {
            let status = match delta.status() {
                git2::Delta::Added => "A".to_string(),
                git2::Delta::Deleted => "D".to_string(),
                git2::Delta::Modified => "M".to_string(),
                git2::Delta::Renamed => "R".to_string(),
                git2::Delta::Typechange => "T".to_string(),
                _ => "M".to_string(),
            };
            let path = delta
                .new_file()
                .path()
                .or_else(|| delta.old_file().path())
                .and_then(|p| p.to_str())
                .unwrap_or("")
                .to_string();
            if !path.is_empty() {
                files.push(BranchComparisonFile { path, status });
            }
            true
        },
        None,
        None,
        None,
    )?;

    Ok(BranchComparison {
        ahead,
        behind,
        files,
    })
}

pub fn branch_from_stash(
    repo_path: &std::path::Path,
    index: usize,
    branch_name: String,
) -> crate::error::Result<()> {
    let output = std::process::Command::new("git")
        .arg("stash")
        .arg("branch")
        .arg(&branch_name)
        .arg(format!("stash@{{{}}}", index))
        .current_dir(repo_path)
        .output()?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string().into())
    }
}
