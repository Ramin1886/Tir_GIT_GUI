use git2::Repository;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ToolCommands {
    pub diff: Option<String>,
    pub merge: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ToolsConfig {
    pub default: ToolCommands,
    #[serde(default)]
    pub extensions: HashMap<String, ToolCommands>,
}

fn tool_exists(name: &str) -> bool {
    std::process::Command::new("which")
        .arg(name)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn get_file_content_from_head(
    repo: &git2::Repository,
    path: &str,
) -> crate::error::Result<Vec<u8>> {
    let head = repo.head()?;
    let commit = head.peel_to_commit()?;
    let tree = commit.tree()?;
    let entry = tree.get_path(std::path::Path::new(path))?;
    let object = entry.to_object(repo)?;
    let blob = object
        .as_blob()
        .ok_or_else(|| "Object is not a blob".to_string())?;
    Ok(blob.content().to_vec())
}

fn get_conflict_stages(
    repo: &git2::Repository,
    path: &str,
) -> crate::error::Result<(Vec<u8>, Vec<u8>, Vec<u8>)> {
    let index = repo.index()?;

    let mut base = Vec::new();
    let mut current = Vec::new();
    let mut incoming = Vec::new();

    for entry in index.iter() {
        let entry_path = String::from_utf8_lossy(&entry.path);
        if entry_path == path {
            let stage = (entry.flags >> 12) & 3;
            if let Ok(blob) = repo.find_blob(entry.id) {
                let content = blob.content().to_vec();
                match stage {
                    1 => base = content,
                    2 => current = content,
                    3 => incoming = content,
                    _ => {}
                }
            }
        }
    }

    Ok((base, current, incoming))
}

pub fn get_tools_config_path() -> crate::error::Result<std::path::PathBuf> {
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let path = std::path::PathBuf::from(home)
        .join(".config")
        .join("git-gui")
        .join("tools.toml");
    Ok(path)
}

pub fn load_tools_config() -> crate::error::Result<ToolsConfig> {
    let path = get_tools_config_path()?;
    if !path.exists() {
        // Build auto-detected or standard default config
        let mut default_ext = HashMap::new();
        default_ext.insert(
            "rs".to_string(),
            ToolCommands {
                diff: Some("difftastic {local} {remote}".to_string()),
                merge: Some("vimdiff {current} {incoming} {base} {output}".to_string()),
            },
        );

        let config = ToolsConfig {
            default: ToolCommands {
                diff: Some("code --diff {local} {remote}".to_string()),
                merge: Some("code --merge {current} {incoming} {base} {output}".to_string()),
            },
            extensions: default_ext,
        };

        save_tools_config(&config)?;
        return Ok(config);
    }

    let content = std::fs::read_to_string(path)?;
    let config: ToolsConfig = toml::from_str(&content).map_err(|e| e.to_string())?;
    Ok(config)
}

pub fn save_tools_config(config: &ToolsConfig) -> crate::error::Result<()> {
    let path = get_tools_config_path()?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let content = toml::to_string(config).map_err(|e| e.to_string())?;
    std::fs::write(path, content)?;
    Ok(())
}

pub fn detect_installed_tools() -> crate::error::Result<ToolsConfig> {
    let mut config = ToolsConfig::default();

    if tool_exists("code") {
        config.default.diff = Some("code --diff {local} {remote}".to_string());
        config.default.merge =
            Some("code --merge {current} {incoming} {base} {output}".to_string());
    } else if tool_exists("meld") {
        config.default.diff = Some("meld {local} {remote}".to_string());
        config.default.merge = Some("meld {current} {incoming} {base} {output}".to_string());
    } else if tool_exists("nvim") {
        config.default.diff = Some("nvim -d {local} {remote}".to_string());
        config.default.merge = Some("nvim -d {current} {incoming} {base} {output}".to_string());
    } else {
        config.default.diff = Some("code --diff {local} {remote}".to_string());
        config.default.merge =
            Some("code --merge {current} {incoming} {base} {output}".to_string());
    }

    fn get_default_difftastic() -> ToolCommands {
        ToolCommands {
            diff: Some("difft {local} {remote}".to_string()),
            ..Default::default()
        }
    }

    if tool_exists("difft") {
        config
            .extensions
            .insert("rs".to_string(), get_default_difftastic());
    }

    Ok(config)
}

fn shell_escape(s: &str) -> String {
    format!("'{}'", s.replace("'", "'\\''"))
}

pub fn launch_external_diff(
    repo_path: &std::path::Path,
    file_path: String,
) -> crate::error::Result<()> {
    let repo = Repository::open(repo_path)?;

    let config = load_tools_config()?;
    let ext = std::path::Path::new(&file_path)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");

    let tool_tmpl = config
        .extensions
        .get(ext)
        .and_then(|e| e.diff.as_ref())
        .or(config.default.diff.as_ref())
        .ok_or_else(|| "No diff tool configured".to_string())?;

    let head_content = get_file_content_from_head(&repo, &file_path).unwrap_or_default();

    let temp_dir = repo_path.join(".git").join("git-gui-temp");
    std::fs::create_dir_all(&temp_dir)?;

    let temp_file_path = temp_dir.join(format!(
        "head-{}",
        std::path::Path::new(&file_path)
            .file_name()
            .unwrap()
            .to_str()
            .unwrap()
    ));
    std::fs::write(&temp_file_path, head_content)?;

    let local_file_path = repo_path.join(&file_path);

    let cmd_string = tool_tmpl
        .replace("{local}", &shell_escape(&local_file_path.to_string_lossy()))
        .replace("{remote}", &shell_escape(&temp_file_path.to_string_lossy()))
        .replace("{filename}", &shell_escape(&file_path));

    let _ = std::process::Command::new("sh")
        .arg("-c")
        .arg(&cmd_string)
        .spawn()?;

    Ok(())
}

pub fn launch_external_merge(
    repo_path: &std::path::Path,
    file_path: String,
) -> crate::error::Result<()> {
    let repo = Repository::open(repo_path)?;

    let (base_content, current_content, incoming_content) = get_conflict_stages(&repo, &file_path)?;

    let config = load_tools_config()?;
    let ext = std::path::Path::new(&file_path)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");

    let tool_tmpl = config
        .extensions
        .get(ext)
        .and_then(|e| e.merge.as_ref())
        .or(config.default.merge.as_ref())
        .ok_or_else(|| "No merge tool configured".to_string())?;

    let temp_dir = repo_path.join(".git").join("git-gui-temp");
    std::fs::create_dir_all(&temp_dir)?;

    let file_name = std::path::Path::new(&file_path)
        .file_name()
        .unwrap()
        .to_str()
        .unwrap();
    let base_tmp = temp_dir.join(format!("base-{}", file_name));
    let current_tmp = temp_dir.join(format!("current-{}", file_name));
    let incoming_tmp = temp_dir.join(format!("incoming-{}", file_name));

    std::fs::write(&base_tmp, base_content)?;
    std::fs::write(&current_tmp, current_content)?;
    std::fs::write(&incoming_tmp, incoming_content)?;

    let output_path = repo_path.join(&file_path);

    let cmd_string = tool_tmpl
        .replace("{base}", &shell_escape(&base_tmp.to_string_lossy()))
        .replace("{current}", &shell_escape(&current_tmp.to_string_lossy()))
        .replace("{incoming}", &shell_escape(&incoming_tmp.to_string_lossy()))
        .replace("{output}", &shell_escape(&output_path.to_string_lossy()))
        .replace("{filename}", &shell_escape(&file_path));

    let _ = std::process::Command::new("sh")
        .arg("-c")
        .arg(&cmd_string)
        .spawn()?;

    Ok(())
}

pub fn test_tool_command(command_str: String) -> crate::error::Result<()> {
    let temp_dir = std::env::temp_dir().join("git-gui-test");
    std::fs::create_dir_all(&temp_dir)?;

    let local = temp_dir.join("local.txt");
    let remote = temp_dir.join("remote.txt");
    let base = temp_dir.join("base.txt");
    let output = temp_dir.join("output.txt");

    std::fs::write(
        &local,
        "Mock Local Version Content\nThis is line 2 of the local version.",
    )?;
    std::fs::write(
        &remote,
        "Mock Remote Version Content\nThis is line 2 of the remote version.",
    )?;
    std::fs::write(
        &base,
        "Mock Base Ancestor Content\nThis is the base version of the file.",
    )?;

    let cmd = command_str
        .replace("{local}", &shell_escape(&local.to_string_lossy()))
        .replace("{remote}", &shell_escape(&remote.to_string_lossy()))
        .replace("{base}", &shell_escape(&base.to_string_lossy()))
        .replace("{current}", &shell_escape(&local.to_string_lossy()))
        .replace("{incoming}", &shell_escape(&remote.to_string_lossy()))
        .replace("{output}", &shell_escape(&output.to_string_lossy()))
        .replace("{filename}", &shell_escape("test.txt"));

    let _ = std::process::Command::new("sh")
        .arg("-c")
        .arg(&cmd)
        .spawn()?;

    Ok(())
}
