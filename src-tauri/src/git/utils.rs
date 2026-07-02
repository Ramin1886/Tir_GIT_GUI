pub fn get_parent_tree<'repo>(
    commit: &git2::Commit<'repo>,
) -> crate::error::Result<Option<git2::Tree<'repo>>> {
    if commit.parent_count() > 0 {
        let parent = commit.parent(0)?;
        let tree = parent.tree()?;
        Ok(Some(tree))
    } else {
        Ok(None)
    }
}

pub fn get_commit_diff<'repo>(
    repo: &'repo git2::Repository,
    commit: &git2::Commit<'repo>,
    opts: Option<&mut git2::DiffOptions>,
) -> crate::error::Result<git2::Diff<'repo>> {
    let commit_tree = commit.tree()?;
    let parent_tree = get_parent_tree(commit)?;

    let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&commit_tree), opts)?;

    Ok(diff)
}
