# Contributing to Tir Git GUI

First off, thank you for considering contributing to Tir! We welcome contributions from everyone. 

## Code of Conduct
By participating in this project, you agree to abide by our Code of Conduct. Please treat fellow contributors with respect.

## How to Contribute

### 1. Reporting Bugs
- Make sure the bug was not already reported by searching through the issues.
- Open a new issue and use the provided bug report template, including OS, Tauri version, and steps to reproduce.

### 2. Suggesting Enhancements
- Open a new issue with a clear title and detailed description of the proposed feature.
- Explain *why* this enhancement would be useful to most users.

### 3. Pull Requests
1. Fork the repository and create your branch from `main`.
2. Ensure your code follows the existing style (we use Prettier, ESLint, and Rust `clippy`).
3. Add or update tests as appropriate (Vitest/Playwright for frontend, `cargo test` for backend).
4. Run the test suite and ensure all tests pass.
5. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/).
   - Format: `type(scope): description`
   - Example: `feat(ui): add syntax highlighting to diff viewer`
6. Open a PR, describing the problem you solved and linking any related issues.

## Development Setup

1. Install Node.js (v18+) and Rust (1.75+).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Linting and Formatting
We use `husky` and `lint-staged` to enforce code quality before commits. When you attempt to commit, the pre-commit hook will automatically run Prettier and ESLint on your staged files.

- Manually format frontend code: `npm run lint`
- Manually format backend code: `cargo clippy && cargo fmt`

Thank you for contributing!
