# Security Policy

## Supported Versions

Currently, only the latest `main` branch and the most recent release tag are supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| Older   | :x:                |

## Reporting a Vulnerability

Security is a critical priority for Tir Git GUI, especially since the application interfaces with sensitive local files, executes git commands, and uses personal access tokens.

If you discover a security vulnerability within Tir, please **do not open a public issue**. 

Instead, please send an email to the repository maintainer directly or use GitHub's private vulnerability reporting feature if enabled on the repository.

Please include the following details in your report:
- A clear description of the vulnerability.
- Steps to reproduce the vulnerability (proof of concept).
- The version of Tir and your operating system.
- Potential impact and any ideas on how to fix it.

We aim to acknowledge receipt of vulnerability reports within 48 hours and provide a timeline for a fix.

## Security Architecture

When contributing, keep these security boundaries in mind:
- **Tauri IPC**: Avoid using arbitrary string templates in backend commands (`sh -c`). Always parse and pass arguments strictly using `std::process::Command::new(binary).args()`.
- **Content Security Policy (CSP)**: We use a strict CSP to block arbitrary remote scripts and iframes.
- **Tokens**: Personal Access Tokens for GitHub and GitLab are handled securely. Do not log them to stdout/stderr or store them in plaintext files.
