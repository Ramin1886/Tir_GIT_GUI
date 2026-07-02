// Git module - re-exports all submodules for backwards compatibility.
// Each submodule contains domain-specific git operations.

use git2::Repository;
pub mod blame;
pub mod branches;
pub mod diff;
pub mod history;
pub mod rebase;
pub mod remotes;
pub mod stashes;
pub mod submodules;
pub mod tags;
pub mod tools;
pub mod utils;
pub mod working_tree;

pub use blame::*;
pub use branches::*;
pub use diff::*;
pub use history::*;
pub use rebase::*;
pub use remotes::*;
pub use stashes::*;
pub use submodules::*;
pub use tags::*;
pub use tools::*;
pub use utils::*;
pub use working_tree::*;

// --- Remaining operations that don't fit neatly into a single domain ---

pub fn check_merge_conflicts(
    repo_path: &std::path::Path,
    base: &str,
    head: &str,
) -> crate::error::Result<Vec<String>> {
    let repo = Repository::open(repo_path)?;

    let base_obj = repo.revparse_single(base)?;
    let base_commit = base_obj.as_commit().ok_or("Base is not a commit")?;

    let head_obj = repo.revparse_single(head)?;
    let head_commit = head_obj.as_commit().ok_or("Head is not a commit")?;

    let index = repo.merge_commits(base_commit, head_commit, None)?;

    let mut conflicted_files = Vec::new();
    if index.has_conflicts() {
        let conflicts = index.conflicts()?;
        for conflict in conflicts {
            let conflict = conflict?;
            if let Some(entry) = conflict.our.or(conflict.their).or(conflict.ancestor) {
                let path_str = String::from_utf8_lossy(&entry.path).to_string();
                if !conflicted_files.contains(&path_str) {
                    conflicted_files.push(path_str);
                }
            }
        }
    }

    Ok(conflicted_files)
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct RepoSummary {
    pub path: String,
    pub active_branch: String,
    pub uncommitted_changes_count: usize,
    pub ahead: usize,
    pub behind: usize,
}

pub fn get_repo_summary(path: &std::path::Path) -> crate::error::Result<RepoSummary> {
    let repo = git2::Repository::open(path)?;

    // Get active branch
    let active_branch = match repo.head() {
        Ok(reference) => reference.shorthand().unwrap_or("HEAD").to_string(),
        Err(_) => "None".to_string(),
    };

    // Get uncommitted changes count
    let mut status_opts = git2::StatusOptions::new();
    status_opts
        .include_untracked(true)
        .recurse_untracked_dirs(true);
    let statuses = repo.statuses(Some(&mut status_opts))?;
    let uncommitted_changes_count = statuses.len();

    // Get ahead/behind count for active branch
    let mut ahead = 0;
    let mut behind = 0;
    if let Ok(head_branch) = repo.find_branch(&active_branch, git2::BranchType::Local) {
        if let Ok(upstream) = head_branch.upstream() {
            if let (Some(local_id), Some(upstream_id)) =
                (head_branch.get().target(), upstream.get().target())
            {
                if let Ok((ah, bh)) = repo.graph_ahead_behind(local_id, upstream_id) {
                    ahead = ah;
                    behind = bh;
                }
            }
        }
    }

    Ok(RepoSummary {
        path: path.to_str().unwrap_or("").to_string(),
        active_branch,
        uncommitted_changes_count,
        ahead,
        behind,
    })
}
