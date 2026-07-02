use reqwest::header::{ACCEPT, USER_AGENT};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::{command, AppHandle, Emitter};
use tauri_plugin_updater::UpdaterExt;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GithubRelease {
    pub name: Option<String>,
    pub tag_name: String,
    pub body: Option<String>,
    pub published_at: Option<String>,
    pub prerelease: bool,
    pub assets: Vec<GithubAsset>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GithubAsset {
    pub name: String,
    pub browser_download_url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpdateInfo {
    pub version: String,
    pub release_notes: String,
    pub date: String,
    pub latest_json_url: String,
    pub channel: String,
}

const GITHUB_API_RELEASES: &str = "https://api.github.com/repos/Ramin1886/Tir_GIT_GUI/releases";

async fn fetch_all_releases() -> Result<Vec<GithubRelease>, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .get(GITHUB_API_RELEASES)
        .header(USER_AGENT, "Tir-Tauri-App")
        .header(ACCEPT, "application/vnd.github.v3+json")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("GitHub API error: {}", res.status()));
    }

    let releases: Vec<GithubRelease> = res.json().await.map_err(|e| e.to_string())?;
    Ok(releases)
}

#[command]
pub async fn fetch_releases() -> Result<Vec<GithubRelease>, String> {
    fetch_all_releases().await
}

#[command]
pub async fn check_updates(channel: String) -> Result<Option<UpdateInfo>, String> {
    let releases = fetch_all_releases().await?;

    // Filter by channel
    let filtered_releases = releases
        .into_iter()
        .filter(|r| {
            match channel.as_str() {
                "Stable" => {
                    !r.prerelease
                        && !r.tag_name.contains("-beta")
                        && !r.tag_name.contains("-nightly")
                }
                "Beta" => r.tag_name.contains("-beta"),
                "Nightly" => r.tag_name.contains("-nightly"),
                _ => !r.prerelease, // default to stable
            }
        })
        .collect::<Vec<_>>();

    if filtered_releases.is_empty() {
        return Ok(None);
    }

    // The first one is the newest (GitHub returns in reverse chronological order)
    let latest_release = &filtered_releases[0];

    // Find the latest.json asset
    let latest_json_asset = latest_release
        .assets
        .iter()
        .find(|a| a.name == "latest.json");

    if let Some(asset) = latest_json_asset {
        Ok(Some(UpdateInfo {
            version: latest_release.tag_name.clone(),
            release_notes: latest_release.body.clone().unwrap_or_default(),
            date: latest_release.published_at.clone().unwrap_or_default(),
            latest_json_url: asset.browser_download_url.clone(),
            channel,
        }))
    } else {
        Ok(None)
    }
}

#[command]
pub async fn install_update(app: AppHandle, url: String) -> Result<(), String> {
    // We emit events to track progress on the frontend
    let _ = app.emit("update-status", "checking");

    // Initialize the updater with the specific latest.json URL
    let endpoint: reqwest::Url = url.parse().map_err(|_| "Invalid URL".to_string())?;

    let updater = app
        .updater_builder()
        .endpoints(vec![endpoint])
        .map_err(|e| e.to_string())?
        .version_comparator(|_current, _latest| true) // Bypass version check to allow downgrades!
        .build()
        .map_err(|e| e.to_string())?;

    let update_option = updater.check().await.map_err(|e| e.to_string())?;

    if let Some(update) = update_option {
        let _ = app.emit("update-status", "downloading");

        update
            .download_and_install(
                |downloaded, content_length| {
                    let progress = if let Some(total) = content_length {
                        (downloaded as f64 / total as f64) * 100.0
                    } else {
                        0.0 // Unknown total
                    };
                    // Ignore error if frontend isn't listening
                    let _ = app.emit("update-progress", progress);
                },
                || {
                    let _ = app.emit("update-status", "finished");
                },
            )
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    } else {
        Err("Failed to verify update manifest".to_string())
    }
}
