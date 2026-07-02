# Tir (تیر) Git GUI — Documentation Suite

Welcome to the documentation suite for **Tir**, a lightweight, high-performance Git desktop application. This document serves as the single source of truth for **Users**, **Developers**, and **Build/Release Engineers**.

---

## 📖 Table of Contents
1. [User Guide](#1-user-guide)
   - [Core Git Workflows](#core-git-workflows)
   - [Branching & Merging](#branching--merging)
   - [Collaboration & Workspaces](#collaboration--workspaces)
   - [Advanced Power-User Tools](#advanced-power-user-tools)
   - [External Diff & Merge Tool Dispatch](#external-diff--merge-tool-dispatch)
   - [Keyboard Shortcuts & Command Palette](#keyboard-shortcuts--command-palette)
2. [Developer Guide](#2-developer-guide)
   - [Backend Architecture (Rust + Tauri v2)](#backend-architecture-rust--tauri-v2)
   - [Frontend Architecture (React + TS + Zustand)](#frontend-architecture-react--ts--zustand)
   - [Line-by-Line Staging Pipeline](#line-by-line-staging-pipeline)
   - [In-Memory Conflict Prediction](#in-memory-conflict-prediction)
3. [Build & Release Workflows](#3-build--release-workflows)
   - [Platform Prerequisites](#platform-prerequisites)
   - [Build & Run Locally](#build--run-locally)
   - [CI/CD Release Pipelines](#cicd-release-pipelines)
   - [Packaging & Distribution](#packaging--distribution)

---

## 1. User Guide

Tir provides a visual porcelain layer over Git repositories. It is designed to be minimal, responsive, and visual, using a neutral warm palette and teal `#01696f` highlights.

### Core Git Workflows

#### Working Tree & Staging
- **File Staging**: Click checkboxes next to modified files to stage or unstage them. Use the context menu (Right-click) to blame or discard file changes.
- **Hunk Staging**: The Diff viewer displays changes in hunks. You can stage, unstage, or discard entire hunks using the buttons in the hunk headers.
- **Line-by-Line Staging**: Toggle checkboxes next to individual changed lines (green for additions, red for deletions) inside the Diff viewer. Click **Stage Selected** or **Unstage Selected** in the hunk header to apply only those specific lines.

#### Commits
- **Composer**: Write single-line or multi-paragraph messages. Use `Ctrl + Enter` to commit staged changes instantly.
- **Co-authoring**: Enter name and email formats (`Name <email>`) separated by commas in the co-authors input. They are automatically added as `Co-authored-by` footer trailers.
- **Amend**: Check **Amend Last Commit** to pre-fill the composer with the HEAD message and amend it on commit.

#### Commit History & DAG Graph
- **DAG commit graph**: Computes branch lanes dynamically and draws connection lines.
- **Filters**: Filter history instantly using keyword search, author match, file paths, date range, or changed content regex (`git log -S`).

---

### Branching & Merging

#### Drag-and-Drop Branch Operations
Drag a local branch in the sidebar and drop it onto another branch to open the Action Modal:

```
[Drag Branch 'Feature'] ──> [Drop on Branch 'Main'] 
        │
        └──> [Simulate In-Memory Merge]
                    │
                    ├──> [No Conflicts] ──> Clean Badge (Merge / Rebase / Compare)
                    └──> [Conflicts]    ──> Conflict Warning Badge (Merge / Rebase / Compare)
```

#### Predictive Merge Conflict Alerts
Before executing any merge or rebase, Tir runs a simulated dry-run merge in memory. If files have conflicting changes, a warning banner lists the exact conflicted paths so you can anticipate manual resolutions before touching the workspace index.

#### Branch Checkout with Auto-Stash
Checking out branches triggers status checks:
- **Clean state**: Switches immediately.
- **Dirty state (conflicting files)**: Prompts you to **Auto-Stash** (stashes your active changes, switches branches, and pops the stash) or **Discard** (forces checkout).

---

### Collaboration & Workspaces

#### Workspaces Dashboard
Group multiple related Git repositories under custom workspace namespaces:
- Access the **Workspaces** tab to add namespaces.
- View a unified health grid containing the active branch, dirty file counts, and ahead/behind counts for all repositories in the namespace.
- Switch between repositories with a single click.

#### Pull Request Panel
If a repository is hosted on GitHub or GitLab, Tir queries the HTTP hosting API to show a list of open pull requests. You can checkout a PR head locally directly from this panel.
- **Enterprise Support**: Tir supports self-hosted GitHub Enterprise and GitLab Self-Managed instances. Custom API endpoints can be configured in the Settings view alongside your Personal Access Tokens (PATs).

#### CI/CD Status Indicators
Tir automatically fetches GitHub Action runs or GitLab CI pipeline statuses for the top visible commits in history, overlaying green (Passed), yellow (Running), or red (Failed) indicator status badges. Like Pull Requests, this fully supports custom self-hosted API endpoints.

---

### Advanced Power-User Tools

#### Interactive Rebase Editor
Select a commit in the History details and click **Interactive Rebase** to open the reorder grid:
- **Drag-and-drop** or use arrow keys to change commit order.
- Select actions (pick, squash, fixup, edit, drop, reword) from dropdowns.
- Click **Start Rebase**. If conflicts arise, a rebase banner appears in the Working Tree to abort or continue.

#### Git Reflog-Based Undo
Whenever you perform a commit, checkout, merge, rebase, or reset, a banner slide-up appears at the bottom-right. Click **Undo** to safely return the repository state to the previous reflog position (`HEAD@{1}`) without risking unsaved work.

#### Git Flow, LFS, and Hooks
- **Git Flow**: Initialize Git Flow branch prefixes. Supports feature/release/hotfix tracking.
- **Git LFS**: Track new patterns (e.g. `*.psd`), list active locks, and push LFS assets to origin.
- **Git Hooks**: View all client hook scripts (e.g. `pre-commit`) and edit, save, or disable them.

---

### External Diff & Merge Tool Dispatch

Tir delegates file comparisons and manual merge conflict resolutions to third-party tools. Configurations are stored in `~/.config/git-gui/tools.toml` (XDG-compliant on Linux).

#### Placeholder Syntax
Placeholders in command strings are replaced with temporary paths generated at run time:
- `{local}` — Local version path
- `{remote}` — Remote or incoming version path
- `{base}` — Shared parent commit version path
- `{output}` — Target save file path
- `{filename}` — Target relative filename

#### Example Configuration (`tools.toml`)
```toml
[default]
diff = "code --diff {local} {remote}"
merge = "code --merge {current} {incoming} {base} {output}"

[extensions.rs]
diff = "difftastic {local} {remote}"
merge = "vimdiff {current} {incoming} {base} {output}"
```

#### Settings Integration
Navigate to **Settings → External Tools** to:
- Visualise custom default and extension configs.
- Run a **Scan** to automatically discover installed tools (VS Code, Neovim, Meld, difftastic, Beyond Compare, IntelliJ).
- Run **Test** buttons to open execution windows with mock sample files.

---

### Keyboard Shortcuts & Command Palette

| Shortcut Key | Action |
|--------------|--------|
| `Ctrl + K` or `Ctrl + P` | Toggle floating Command Palette |
| `Ctrl + [1-9]` | Fast switch views (Working Tree, History, etc.) |
| `Ctrl + Enter` (in Composer) | Commit staged changes |
| `Escape` | Dismiss modals / Command Palette |

The **Command Palette** supports keyboard-driven searching for commands (Fetch, Pull, Theme Toggles), switching local branches, and navigating repositories.

---

## 2. Developer Guide

### Backend Architecture (Rust + Tauri v2)

The Rust backend is responsible for high-performance file IO, in-memory git logic, and subprocess execution.

- **AppState**: Thread-safe mutex-wrapped state containing option path (`Option<PathBuf>`) of the active open repository.
- **Porcelain delegation**: Tauri commands call safe thread-safe `git2-rs` methods where possible (e.g., status indices, commits, blames). Porcelain CLI wrapper utilities (`run_git_command`) are used for network actions (fetch, push, clone) to naturally inherit system credential configurations.

---

### Frontend Architecture (React + TS + Zustand + Tailwind)

The UI is a highly modular React application built with TypeScript.

- **Global State (`src/store/`)**: Zustand store utilizing a sliced architecture (e.g., `createWorkspaceSlice`, `createSettingsSlice`) to prevent monolithic state management. These slices are combined into a single root store in `index.ts`.
- **Design Tokens & Styling**: The application uses **Tailwind CSS v4** combined with scoped **CSS Modules** (`*.module.css`) for all styling, ensuring high rendering performance and zero class-name leakage.
- **Error Handling (React Error Boundaries)**: Major views (like `HistoryView`, `WorkingTree`) are wrapped in custom `<ErrorBoundary />` components. This ensures that if a single view fails to render (e.g., due to a malformed commit graph), the rest of the application remains stable and interactive.
- **DAG Graph Rendering (`src/components/HistoryView/`)**: Renders connection routing paths on a lightweight HTML Canvas element, achieving 60 FPS performance on 100k+ commit logs.

---

### Line-by-Line Staging Pipeline

Line-by-line and custom hunk staging utilizes unified patches applied directly via system Git.

- **`constructCustomPatch`**: Parses hunk metadata and outputs valid unidiff chunks depending on line selection states and staging modes.
- **`--unidiff-zero`**: Instructs Git to apply patches without contextual line count warnings.

---

### In-Memory Conflict Prediction

Prediction is simulated without polluting the disk working directory by utilizing raw index matching:

```rust
// src-tauri/src/git.rs
pub fn check_merge_conflicts(repo_path: &Path, base: &str, head: &str) -> Result<Vec<String>, String> {
    let repo = Repository::open(repo_path).map_err(|e| e.to_string())?;
    let base_commit = repo.revparse_single(base)?.as_commit().ok_or("Invalid base")?;
    let head_commit = repo.revparse_single(head)?.as_commit().ok_or("Invalid head")?;
    
    // Simulate merge index in memory (finds base ancestor internally)
    let index = repo.merge_commits(&base_commit, &head_commit, None).map_err(|e| e.to_string())?;
    
    let mut conflicted_files = Vec::new();
    if index.has_conflicts() {
        for conflict in index.conflicts()? {
            let conflict = conflict?;
            if let Some(entry) = conflict.our.or(conflict.their) {
                conflicted_files.push(String::from_utf8_lossy(&entry.path).to_string());
            }
        }
    }
    Ok(conflicted_files)
}
```

---

## 3. Build & Release Workflows

### Platform Prerequisites

To compile Tir on local developer machines:

- **All Platforms**: [Node.js (v18+)](https://nodejs.org/), [Rust (1.75+ / Edition 2021)](https://www.rust-lang.org/)

#### 🐧 Linux (Debian/Ubuntu)
```bash
sudo apt-get update
sudo apt-get install -y libsoup-3.0-dev libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

#### 🍎 macOS
- Install Xcode Command Line Tools: `xcode-select --install`

#### 🏁 Windows
- Install [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with Windows 10/11 SDK.

---

### Build & Run Locally

1. Install Frontend node packages:
   ```bash
   npm install
   ```
2. Launch dev hot-reload server (Vite UI + Tauri window wrapper):
   ```bash
   npm run dev
   ```
3. Run backend tests (Rust):
   ```bash
   cargo test --manifest-path src-tauri/Cargo.toml
   ```
4. Run frontend unit tests (Vitest):
   ```bash
   npm run test
   ```
5. Run E2E integration tests (Playwright):
   ```bash
   npx playwright test
   ```

---

### CI/CD Release Pipelines

GitHub Actions workflow definition for cross-platform build distributions:

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: 'ubuntu-22.04'
            args: ''
          - platform: 'macos-latest'
            args: ''
          - platform: 'windows-latest'
            args: ''

    runs-on: ${{ matrix.platform }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@stable

      - name: Install Linux system dependencies
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libsoup-3.0-dev libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

      - name: Install Node packages
        run: npm ci

      - name: Build and Package Tauri App
        uses: tauri-apps/tauri-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'Tir v${{ github.ref_name }}'
          args: ${{ matrix.args }}
```

---

### Packaging & Distribution

Tauri generates native installation formats for each platform target:

- **Linux**: Output targets include `.deb` (Debian/Ubuntu) and `.AppImage` (portable package).
  > **Note for AppImage Users:** Tauri does not bundle the webview engine (`webkit2gtk`) inside the `.AppImage` for security and file size reasons. While `.deb` files handle this automatically via APT, users running the `.AppImage` on non-Debian distributions (like Fedora or Arch Linux) must ensure they have `webkit2gtk-4.1` installed on their host system.
- **macOS**: Output targets include `.dmg` disk image and `.app` bundles (supports both Intel and Apple Silicon targets).
- **Windows**: Output targets include `.msi` installers and customized NSIS bundles.
- **Arch Linux (AUR)**:
  An AUR package build script is maintained under `packaging/aur/PKGBUILD`. It builds from source or wraps the compiled release binaries:
  ```bash
  # PKGBUILD snippet
  pkgname=git-gui-bin
  pkgver=0.1.0
  arch=('x86_64')
  depends=('webkit2gtk-4.1' 'gtk3' 'libayatana-appindicator3')
  # Packages deb/appimage binaries directly to /usr/bin/git-gui
  ```
