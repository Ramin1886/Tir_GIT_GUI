use serde::{Serialize, Serializer};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum GitError {
    #[error("Git command failed: {0}")]
    CommandFailed(String),

    #[error("Failed to parse output: {0}")]
    ParseError(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("UTF-8 encoding error: {0}")]
    Utf8(#[from] std::string::FromUtf8Error),

    #[error("Tauri error: {0}")]
    Tauri(#[from] tauri::Error),

    #[error("Git error: {0}")]
    Git(#[from] git2::Error),
}

// Implement Serialize for GitError so it can be returned directly to the frontend via Result<T, GitError>
impl Serialize for GitError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

impl From<String> for GitError {
    fn from(s: String) -> Self {
        GitError::CommandFailed(s)
    }
}

impl From<&str> for GitError {
    fn from(s: &str) -> Self {
        GitError::CommandFailed(s.to_string())
    }
}

pub type Result<T> = std::result::Result<T, GitError>;
