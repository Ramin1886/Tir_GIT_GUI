pub mod commands;
pub mod error;
pub mod git;
pub mod state;
pub mod updater;

pub(crate) fn encode_base64(bytes: &[u8]) -> String {
    const CHARSET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut res = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        match chunk.len() {
            3 => {
                res.push(CHARSET[((chunk[0] >> 2) & 0x3f) as usize] as char);
                res.push(
                    CHARSET[((((chunk[0] & 0x03) << 4) | (chunk[1] >> 4)) & 0x3f) as usize] as char,
                );
                res.push(
                    CHARSET[((((chunk[1] & 0x0f) << 2) | (chunk[2] >> 6)) & 0x3f) as usize] as char,
                );
                res.push(CHARSET[(chunk[2] & 0x3f) as usize] as char);
            }
            2 => {
                res.push(CHARSET[((chunk[0] >> 2) & 0x3f) as usize] as char);
                res.push(
                    CHARSET[((((chunk[0] & 0x03) << 4) | (chunk[1] >> 4)) & 0x3f) as usize] as char,
                );
                res.push(CHARSET[(((chunk[1] & 0x0f) << 2) & 0x3f) as usize] as char);
                res.push('=');
            }
            1 => {
                res.push(CHARSET[((chunk[0] >> 2) & 0x3f) as usize] as char);
                res.push(CHARSET[(((chunk[0] & 0x03) << 4) & 0x3f) as usize] as char);
                res.push('=');
                res.push('=');
            }
            _ => unreachable!(),
        }
    }
    res
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_stronghold::Builder::new(|password| {
                use argon2::{hash_raw, Config, Variant, Version};
                let config = Config {
                    lanes: 4,
                    mem_cost: 10_000,
                    time_cost: 2,
                    variant: Variant::Argon2id,
                    version: Version::Version13,
                    ..Default::default()
                };
                let salt = b"tir-git-gui-salt";
                let key =
                    hash_raw(password.as_bytes(), salt, &config).expect("failed to hash password");
                key.to_vec()
            })
            .build(),
        )
        .manage(state::AppState::default())
        .invoke_handler(tauri::generate_handler![
            // updater
            updater::fetch_releases,
            updater::check_updates,
            updater::install_update,
            // repo
            commands::repo::open_repository,
            commands::repo::run_git_command,
            commands::repo::list_git_hooks,
            commands::repo::save_git_hook,
            commands::repo::delete_git_hook,
            commands::repo::check_merge_conflicts,
            commands::repo::clone_repository,
            commands::repo::get_repo_summary,
            // working_tree
            commands::working_tree::get_status,
            commands::working_tree::stage_file,
            commands::working_tree::unstage_file,
            commands::working_tree::discard_file_changes,
            commands::working_tree::stage_all_files,
            commands::working_tree::unstage_all_files,
            commands::working_tree::stage_hunk,
            commands::working_tree::unstage_hunk,
            commands::working_tree::discard_hunk,
            commands::working_tree::apply_custom_patch,
            // history
            commands::history::get_history,
            commands::history::get_commit_details,
            commands::history::get_commit_template,
            commands::history::create_commit,
            commands::history::cherry_pick,
            commands::history::revert_commit,
            commands::history::get_parent_commit_id,
            commands::history::get_file_content_at_commit,
            // diff
            commands::diff::get_diff,
            // branches
            commands::branches::list_branches,
            commands::branches::checkout_branch,
            commands::branches::create_branch,
            commands::branches::delete_branch,
            commands::branches::rename_branch,
            commands::branches::delete_remote_branch,
            commands::branches::compare_branches,
            commands::branches::branch_from_stash,
            // stashes
            commands::stashes::list_stashes,
            commands::stashes::save_stash,
            commands::stashes::apply_stash,
            commands::stashes::pop_stash,
            commands::stashes::drop_stash,
            // tags
            commands::tags::list_tags,
            commands::tags::create_tag,
            commands::tags::delete_tag,
            commands::tags::push_tag,
            // remotes
            commands::remotes::list_remotes,
            commands::remotes::add_remote,
            commands::remotes::delete_remote,
            commands::remotes::fetch_remote,
            commands::remotes::push_remote,
            commands::remotes::pull_remote,
            commands::remotes::set_remote_url,
            // tools
            commands::tools::load_tools_config,
            commands::tools::save_tools_config,
            commands::tools::detect_installed_tools,
            commands::tools::launch_external_diff,
            commands::tools::launch_external_merge,
            commands::tools::test_tool_command,
            // submodules
            commands::submodules::list_submodules,
            commands::submodules::init_submodules,
            commands::submodules::update_submodules,
            // rebase
            commands::rebase::get_rebase_commits,
            commands::rebase::perform_interactive_rebase,
            commands::rebase::rebase_continue,
            commands::rebase::rebase_abort,
            // blame
            commands::blame::get_blame,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
