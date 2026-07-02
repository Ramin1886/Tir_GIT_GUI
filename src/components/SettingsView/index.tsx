import { useSettings } from './useSettings';
import { UpdatesCard } from './UpdatesCard';

import styles from "./SettingsView.module.css";


export function SettingsView() {
  const {
    repoPathInput,
    setRepoPathInput,
    ghTokenInput,
    setGhTokenInput,
    glTokenInput,
    setGlTokenInput,
    toolsConfig,
    newExtension,
    setNewExtension,
    gitName,
    setGitName,
    gitEmail,
    setGitEmail,
    gitGpgSign,
    setGitGpgSign,
    gitConfigLoading,
    lfsVersion,
    lfsTrackedPatterns,
    lfsLocks,
    newLfsPattern,
    setNewLfsPattern,
    lfsLoading,
    handleSaveIntegrations,
    handleTrackLfsPattern,
    handleLfsPush,
    checkLfsStatus,
    handleSaveGitConfig,
    handleThemeChange,
    handleIntervalChange,
    handleSaveRepoPath,
    handleUpdateDefaultTool,
    handleUpdateExtensionTool,
    handleSaveTools,
    handleAddExtension,
    handleRemoveExtension,
    handleDetectTools,
    handleTestTool,
    theme,
    autoRefreshInterval
  } = useSettings();
  return (
    <div className="settings-view">
      <div className="settings-view__header">
        <h2 className="settings-view__title">Settings</h2>
      </div>
      <div className="settings-view__content">
        {/* Theme Card */}
        <div className="settings-card">
          <h3 className="settings-card__title">Theme Override</h3>
          <p className="settings-card__description">
            Choose whether to match the system styling or force a specific mode.
          </p>
          <div className="theme-toggle-group">
            {(['system', 'light', 'dark'] as const).map((t) => (
              <button
                key={t}
                className={`theme-btn ${theme === t ? 'theme-btn--active' : ''}`}
                onClick={() => handleThemeChange(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Repository Config Card */}
        <div className="settings-card">
          <h3 className="settings-card__title">Repository Config</h3>
          <p className="settings-card__description">
            Define a default Git repository path to open automatically on startup.
          </p>
          <form onSubmit={handleSaveRepoPath} className="settings-form">
            <input
              type="text"
              placeholder="e.g. /home/user/my-project"
              value={repoPathInput}
              onChange={(e) => setRepoPathInput(e.target.value)}
              className="settings-input"
            />
            <button type="submit" className="btn btn--primary">
              Save Path
            </button>
          </form>
        </div>

        {/* Auto Refresh Card */}
        <div className="settings-card">
          <h3 className="settings-card__title">Background Refresh</h3>
          <p className="settings-card__description">
            Specify how frequently the application fetches background status changes.
          </p>
          <div className="settings-select-wrapper">
            <select
              value={autoRefreshInterval}
              onChange={handleIntervalChange}
              className="settings-select"
            >
              <option value={0}>Manual Refresh Only</option>
              <option value={5000}>Every 5 Seconds</option>
              <option value={10000}>Every 10 Seconds</option>
              <option value={30000}>Every 30 Seconds</option>
              <option value={60000}>Every 1 Minute</option>
            </select>
          </div>
        </div>

        <UpdatesCard />

        {/* Hosting Integrations Card */}
        <div className="settings-card">
          <h3 className="settings-card__title">Hosting Integrations</h3>
          <p className="settings-card__description">
            Configure your personal access tokens for GitHub or GitLab to enable pulling pull requests and showing test build statuses.
          </p>
          <form onSubmit={handleSaveIntegrations} className="settings-form">
            <div className={styles.style2}>
              <label className={styles.style3}>GitHub Personal Access Token</label>
              <input
                type="password"
                placeholder="ghp_..."
                value={ghTokenInput}
                onChange={(e) => setGhTokenInput(e.target.value)}
                className="settings-input" />
            </div>
            <div className={styles.style5}>
              <label className={styles.style6}>GitLab Personal Access Token</label>
              <input
                type="password"
                placeholder="glpat-..."
                value={glTokenInput}
                onChange={(e) => setGlTokenInput(e.target.value)}
                className="settings-input" />
            </div>
            <button type="submit" className="btn btn--primary">
              Save Credentials
            </button>
          </form>
        </div>

        {/* Git Profile & GPG Config Card */}
        <div className="settings-card">
          <h3 className="settings-card__title">Git User Profile & GPG Signing</h3>
          <p className="settings-card__description">
            Configure the user name, email address, and commit signature settings. These will be updated in the repository local config.
          </p>
          <form onSubmit={handleSaveGitConfig} className="settings-form">
            <div className={styles.style10}>
              <label className={styles.style11}>User Name (user.name)</label>
              <input
                type="text"
                placeholder="e.g. Jane Doe"
                value={gitName}
                onChange={(e) => setGitName(e.target.value)}
                className="settings-input"
                required />
            </div>
            <div className={styles.style13}>
              <label className={styles.style14}>User Email (user.email)</label>
              <input
                type="email"
                placeholder="e.g. jane.doe@example.com"
                value={gitEmail}
                onChange={(e) => setGitEmail(e.target.value)}
                className="settings-input"
                required />
            </div>
            <div className={styles.style16}>
              <input
                type="checkbox"
                id="gpgSignCheckbox"
                checked={gitGpgSign}
                onChange={(e) => setGitGpgSign(e.target.checked)}
                className={styles.style17}
              />
              <label htmlFor="gpgSignCheckbox" className={styles.style18}>
                Sign commits automatically using GPG key (commit.gpgsign)
              </label>
            </div>
            <button type="submit" className="btn btn--primary" disabled={gitConfigLoading}>
              {gitConfigLoading ? 'Saving...' : 'Save Git Configuration'}
            </button>
          </form>
        </div>

        {/* External Tools Config Card */}
        <div className="settings-card">
          <h3 className="settings-card__title">External Tools (Diff & Merge)</h3>
          <p className="settings-card__description">
            Configure custom execution dispatch scripts for viewing diffs and resolving merge conflicts.
            Valid placeholders: <code>{'{local}'}</code>, <code>{'{remote}'}</code>, <code>{'{base}'}</code>, <code>{'{current}'}</code>, <code>{'{incoming}'}</code>, <code>{'{output}'}</code>, <code>{'{filename}'}</code>.
          </p>

          <div className={styles.style22}>
            <button type="button" className="btn btn--secondary" onClick={handleDetectTools}>
              Scan & Detect Installed Tools
            </button>
            <button type="button" className="btn btn--primary" onClick={handleSaveTools}>
              Save Config
            </button>
          </div>

          {toolsConfig && (
            <table className={styles.style23}>
              <thead>
                <tr className={styles.style24}>
                  <th className={styles.style25}>Extension</th>
                  <th className={styles.style26}>Diff Tool Command</th>
                  <th className={styles.style27}>Merge Tool Command</th>
                  <th className={styles.style28}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Default Row */}
                <tr className={styles.style29}>
                  <td className={styles.style30}>[default]</td>
                  <td className={styles.style31}>
                    <div className={styles.style32}>
                      <input
                        type="text"
                        value={toolsConfig.default.diff || ''}
                        onChange={(e) => handleUpdateDefaultTool('diff', e.target.value)}
                        className={styles.style33}
                      />
                      <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={() => handleTestTool(toolsConfig.default.diff)}>
                        Test
                      </button>
                    </div>
                  </td>
                  <td className={styles.style35}>
                    <div className={styles.style36}>
                      <input
                        type="text"
                        value={toolsConfig.default.merge || ''}
                        onChange={(e) => handleUpdateDefaultTool('merge', e.target.value)}
                        className={styles.style37}
                      />
                      <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={() => handleTestTool(toolsConfig.default.merge)}>
                        Test
                      </button>
                    </div>
                  </td>
                  <td className={styles.style39}></td>
                </tr>

                {/* Overrides */}
                {Object.keys(toolsConfig.extensions).map((ext) => (
                  <tr key={ext} className={styles.style40}>
                    <td className={styles.style41}>.{ext}</td>
                    <td className={styles.style42}>
                      <div className={styles.style43}>
                        <input
                          type="text"
                          value={toolsConfig.extensions[ext].diff || ''}
                          onChange={(e) => handleUpdateExtensionTool(ext, 'diff', e.target.value)}
                          className={styles.style44}
                        />
                        <button
                          type="button"
                          className="btn btn--secondary"
                          onClick={() => handleTestTool(toolsConfig.extensions[ext].diff)}>
                          Test
                        </button>
                      </div>
                    </td>
                    <td className={styles.style46}>
                      <div className={styles.style47}>
                        <input
                          type="text"
                          value={toolsConfig.extensions[ext].merge || ''}
                          onChange={(e) => handleUpdateExtensionTool(ext, 'merge', e.target.value)}
                          className={styles.style48}
                        />
                        <button
                          type="button"
                          className="btn btn--secondary"
                          onClick={() => handleTestTool(toolsConfig.extensions[ext].merge)}>
                          Test
                        </button>
                      </div>
                    </td>
                    <td className={styles.style50}>
                      <button
                        type="button"
                        className="btn btn--danger"
                        onClick={() => handleRemoveExtension(ext)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className={styles.style52}>
            <input
              type="text"
              placeholder="e.g. py, js, cpp"
              value={newExtension}
              onChange={(e) => setNewExtension(e.target.value)}
              className={styles.style53}
            />
            <button type="button" className="btn btn--secondary" onClick={handleAddExtension}>
              Add Extension Override
            </button>
          </div>
        </div>

        {/* Git LFS Config Card */}
        <div className="settings-card">
          <h3 className="settings-card__title">Git Large File Storage (LFS)</h3>
          <p className="settings-card__description">
            Git LFS replaces large files with text pointers inside Git, storing file contents on a remote server.
          </p>
          <div className={styles.style54}>
            <div className={styles.style55}>
              <span className={styles.style56}>LFS Version:</span>{' '}
              <span className={styles.style57}>
                {lfsVersion || 'Checking...'}
              </span>
            </div>

            {lfsVersion && !lfsVersion.includes('Not Installed') && (
              <>
                <div className={styles.style58}>
                  <button type="button" className="btn btn--secondary" onClick={checkLfsStatus} disabled={lfsLoading}>
                    Refresh LFS Status
                  </button>
                  <button type="button" className="btn btn--primary" onClick={handleLfsPush} disabled={lfsLoading}>
                    Push LFS Assets
                  </button>
                </div>

                <div className={styles.style59}>
                  <div className={styles.style60}>
                    <span className={styles.style61}>
                      Tracked Patterns
                    </span>
                    <ul className={styles.style62}>
                      {lfsTrackedPatterns.map((p, idx) => (
                        <li key={idx}>{p}</li>
                      ))}
                    </ul>
                  </div>

                  <div className={styles.style63}>
                    <span className={styles.style64}>
                      Active Locks
                    </span>
                    <ul className={styles.style65}>
                      {lfsLocks.map((l, idx) => (
                        <li key={idx}>{l}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <form onSubmit={handleTrackLfsPattern} className={styles.style66}>
                  <input
                    type="text"
                    placeholder="e.g. *.psd, assets/**/*.mp4"
                    value={newLfsPattern}
                    onChange={(e) => setNewLfsPattern(e.target.value)}
                    required
                    className={styles.style67}
                  />
                  <button type="submit" className="btn btn--primary" disabled={lfsLoading}>
                    Track Pattern
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
