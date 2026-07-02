use git2::Repository;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct DiffLine {
    pub content: String,
    pub origin: char,
    pub old_lineno: Option<u32>,
    pub new_lineno: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiffHunk {
    pub header: String,
    pub lines: Vec<DiffLine>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileDiff {
    pub hunks: Vec<DiffHunk>,
}

pub fn get_diff(
    repo_path: &std::path::Path,
    path: String,
    commit_id: Option<String>,
    staged: bool,
) -> crate::error::Result<FileDiff> {
    let repo = Repository::open(repo_path)?;

    let mut opts = git2::DiffOptions::new();
    opts.include_untracked(true);
    opts.recurse_untracked_dirs(true);
    opts.pathspec(path);

    let diff = if let Some(cid_str) = commit_id {
        let oid = git2::Oid::from_str(&cid_str)?;
        let commit = repo.find_commit(oid)?;
        crate::git::utils::get_commit_diff(&repo, &commit, Some(&mut opts))?
    } else {
        if staged {
            let head_tree = match repo.head() {
                Ok(head_ref) => {
                    let head_commit = head_ref.peel_to_commit()?;
                    Some(head_commit.tree()?)
                }
                Err(_) => None,
            };
            let index = repo.index()?;
            repo.diff_tree_to_index(head_tree.as_ref(), Some(&index), Some(&mut opts))?
        } else {
            let index = repo.index()?;
            repo.diff_index_to_workdir(Some(&index), Some(&mut opts))?
        }
    };

    let hunks = std::cell::RefCell::new(Vec::new());

    diff.foreach(
        &mut |_, _| true,
        None,
        Some(&mut |_, hunk| {
            let header = String::from_utf8_lossy(hunk.header()).into_owned();
            hunks.borrow_mut().push(DiffHunk {
                header,
                lines: Vec::new(),
            });
            true
        }),
        Some(&mut |_, _, line| {
            let mut hunks_borrow = hunks.borrow_mut();
            if let Some(current_hunk) = hunks_borrow.last_mut() {
                let content = String::from_utf8_lossy(line.content()).into_owned();
                current_hunk.lines.push(DiffLine {
                    content,
                    origin: line.origin(),
                    old_lineno: line.old_lineno(),
                    new_lineno: line.new_lineno(),
                });
            }
            true
        }),
    )?;

    Ok(FileDiff {
        hunks: hunks.into_inner(),
    })
}
