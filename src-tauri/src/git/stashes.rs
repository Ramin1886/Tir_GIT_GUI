use git2::Repository;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct StashInfo {
    pub index: usize,
    pub message: String,
    pub id: String,
}

pub fn list_stashes(repo_path: &std::path::Path) -> crate::error::Result<Vec<StashInfo>> {
    let mut repo = Repository::open(repo_path)?;
    let mut stashes = Vec::new();

    repo.stash_foreach(|index, message, oid| {
        stashes.push(StashInfo {
            index,
            message: message.to_string(),
            id: oid.to_string(),
        });
        true
    })?;

    Ok(stashes)
}

pub fn save_stash(
    repo_path: &std::path::Path,
    message: Option<String>,
    include_untracked: bool,
) -> crate::error::Result<()> {
    let mut repo = Repository::open(repo_path)?;
    let signature = repo.signature()?;
    let msg = message.unwrap_or_else(|| "Stash via Git GUI".to_string());

    let mut flags = git2::StashFlags::DEFAULT;
    if include_untracked {
        flags |= git2::StashFlags::INCLUDE_UNTRACKED;
    }

    repo.stash_save(&signature, &msg, Some(flags))?;
    Ok(())
}

pub fn apply_stash(repo_path: &std::path::Path, index: usize) -> crate::error::Result<()> {
    let mut repo = Repository::open(repo_path)?;
    repo.stash_apply(index, None)?;
    Ok(())
}

pub fn pop_stash(repo_path: &std::path::Path, index: usize) -> crate::error::Result<()> {
    let mut repo = Repository::open(repo_path)?;
    repo.stash_pop(index, None)?;
    Ok(())
}

pub fn drop_stash(repo_path: &std::path::Path, index: usize) -> crate::error::Result<()> {
    let mut repo = Repository::open(repo_path)?;
    repo.stash_drop(index)?;
    Ok(())
}
