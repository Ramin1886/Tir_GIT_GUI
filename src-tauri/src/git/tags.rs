use git2::Repository;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct TagInfo {
    pub name: String,
    pub shorthand: String,
    pub id: String,
    pub message: Option<String>,
}

pub fn list_tags(repo_path: &std::path::Path) -> crate::error::Result<Vec<TagInfo>> {
    let repo = Repository::open(repo_path)?;
    let mut tags = Vec::new();

    let tag_names = repo.tag_names(None)?;
    for name_opt in tag_names.iter() {
        if let Ok(Some(name)) = name_opt {
            let ref_name = format!("refs/tags/{}", name);
            if let Ok(reference) = repo.find_reference(&ref_name) {
                let commit_id = match reference.peel(git2::ObjectType::Commit) {
                    Ok(obj) => obj.id().to_string(),
                    Err(_) => reference
                        .target()
                        .unwrap_or(git2::Oid::from_bytes(&[0; 20]).unwrap())
                        .to_string(),
                };

                let mut message = None;
                if let Some(target_oid) = reference.target() {
                    if let Ok(tag_obj) = repo.find_tag(target_oid) {
                        if let Ok(Some(msg)) = tag_obj.message() {
                            message = Some(msg.to_string());
                        }
                    }
                }

                tags.push(TagInfo {
                    name: ref_name,
                    shorthand: name.to_string(),
                    id: commit_id,
                    message,
                });
            }
        }
    }

    Ok(tags)
}

pub fn create_tag(
    repo_path: &std::path::Path,
    name: String,
    target_commit: String,
    message: Option<String>,
) -> crate::error::Result<()> {
    let repo = Repository::open(repo_path)?;
    let oid = git2::Oid::from_str(&target_commit)?;
    let target_obj = repo.find_object(oid, None)?;

    if let Some(msg) = message.filter(|m| !m.trim().is_empty()) {
        let tagger = repo.signature()?;
        repo.tag(&name, &target_obj, &tagger, &msg, false)?;
    } else {
        repo.tag_lightweight(&name, &target_obj, false)?;
    }

    Ok(())
}

pub fn delete_tag(repo_path: &std::path::Path, name: String) -> crate::error::Result<()> {
    let repo = Repository::open(repo_path)?;
    repo.tag_delete(&name)?;
    Ok(())
}

pub fn push_tag(
    repo_path: &std::path::Path,
    remote_name: String,
    tag_name: String,
) -> crate::error::Result<String> {
    let output = std::process::Command::new("git")
        .arg("push")
        .arg(&remote_name)
        .arg(&tag_name)
        .current_dir(repo_path)
        .output()?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stderr).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string().into())
    }
}
