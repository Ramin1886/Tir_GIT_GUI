// Command modules - each maps to a git domain
pub mod blame;
pub mod branches;
pub mod diff;
pub mod history;
pub mod lfs;
pub mod rebase;
pub mod remotes;
pub mod repo;
pub mod stashes;
pub mod submodules;
pub mod tags;
pub mod tools;
pub mod working_tree;

// Re-export all commands for use in generate_handler!
pub use blame::*;
pub use branches::*;
pub use diff::*;
pub use history::*;
pub use lfs::*;
pub use rebase::*;
pub use remotes::*;
pub use repo::*;
pub use stashes::*;
pub use submodules::*;
pub use tags::*;
pub use tools::*;
pub use working_tree::*;
