use git2::Repository;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct BlameLine {
    pub line_number: usize,
    pub commit_id: String,
    pub author: String,
    pub summary: String,
    pub time: i64,
    pub content: String,
}

pub fn get_blame(
    repo_path: &std::path::Path,
    file_path: &str,
    commit_id: Option<String>,
) -> crate::error::Result<Vec<BlameLine>> {
    let repo = Repository::open(repo_path)?;

    let content = if let Some(ref cid) = commit_id {
        if cid.is_empty() {
            std::fs::read_to_string(repo_path.join(file_path)).unwrap_or_else(|_| String::new())
        } else {
            let oid = git2::Oid::from_str(cid)?;
            let commit = repo.find_commit(oid)?;
            let tree = commit.tree()?;
            let entry = tree.get_path(std::path::Path::new(file_path))?;
            let object = entry.to_object(&repo)?;
            let blob = object.as_blob().ok_or_else(|| "Not a blob".to_string())?;
            String::from_utf8_lossy(blob.content()).to_string()
        }
    } else {
        std::fs::read_to_string(repo_path.join(file_path)).unwrap_or_else(|_| String::new())
    };

    let lines: Vec<&str> = content.lines().collect();

    let mut opts = git2::BlameOptions::new();
    if let Some(ref cid) = commit_id {
        if !cid.is_empty() {
            let oid = git2::Oid::from_str(cid)?;
            opts.newest_commit(oid);
        }
    }

    let blame = repo.blame_file(std::path::Path::new(file_path), Some(&mut opts))?;

    let mut commit_cache: std::collections::HashMap<String, (String, String, i64)> =
        std::collections::HashMap::new();
    let mut blame_lines = Vec::new();

    for (idx, line_content) in lines.iter().enumerate() {
        let line_num = idx + 1;

        if let Some(hunk) = blame.get_line(line_num) {
            let cid = hunk.final_commit_id();
            let cid_str = cid.to_string();

            let (author, summary, time) = if let Some(info) = commit_cache.get(&cid_str) {
                (info.0.clone(), info.1.clone(), info.2)
            } else {
                let mut author = "Unknown".to_string();
                let mut summary = "".to_string();
                let mut time = 0i64;

                if let Ok(commit) = repo.find_commit(cid) {
                    author = commit.author().name().unwrap_or("Unknown").to_string();
                    summary = commit.summary().unwrap_or(None).unwrap_or("").to_string();
                    time = commit.time().seconds();
                }

                commit_cache.insert(cid_str.clone(), (author.clone(), summary.clone(), time));
                (author, summary, time)
            };

            blame_lines.push(BlameLine {
                line_number: line_num,
                commit_id: cid_str,
                author,
                summary,
                time,
                content: line_content.to_string(),
            });
        } else {
            blame_lines.push(BlameLine {
                line_number: line_num,
                commit_id: "".to_string(),
                author: "".to_string(),
                summary: "".to_string(),
                time: 0,
                content: line_content.to_string(),
            });
        }
    }

    Ok(blame_lines)
}
