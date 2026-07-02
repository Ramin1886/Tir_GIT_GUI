import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../store';
import styles from './SettingsView.module.css';

interface GithubRelease {
  name: string | null;
  tag_name: string;
  body: string | null;
  published_at: string | null;
  prerelease: boolean;
  assets: { name: string; browser_download_url: string }[];
}

export function UpdatesCard() {
  const { updateChannel, setUpdateChannel, addToast } = useAppStore();
  const [releases, setReleases] = useState<GithubRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    fetchReleases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReleases = async () => {
    setLoading(true);
    try {
      const data: GithubRelease[] = await invoke('fetch_releases');
      setReleases(data);
    } catch (err) {
      console.error(err);
      addToast('Failed to fetch releases from GitHub', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (release: GithubRelease) => {
    const latestJsonAsset = release.assets.find((a) => a.name === 'latest.json');
    if (!latestJsonAsset) {
      addToast('This release does not have a valid latest.json manifest for the updater.', 'error');
      return;
    }

    setInstalling(release.tag_name);
    try {
      await invoke('install_update', { url: latestJsonAsset.browser_download_url });
      addToast(`Successfully downloaded ${release.tag_name}. Restart to apply.`, 'success');
    } catch (err) {
      console.error(err);
      addToast(`Failed to install update: ${err}`, 'error');
    } finally {
      setInstalling(null);
    }
  };

  return (
    <div className="settings-card">
      <h3 className="settings-card__title">Software Updates & Version Manager</h3>
      <p className="settings-card__description">
        Choose your update channel (Stable, Beta, Nightly). The application will notify you of new updates in your selected channel. You can also manually install or rollback to previous versions here.
      </p>

      <div className="settings-select-wrapper" style={{ marginBottom: '1rem' }}>
        <select
          value={updateChannel}
          onChange={(e) => setUpdateChannel(e.target.value as 'Stable' | 'Beta' | 'Nightly')}
          className="settings-select"
        >
          <option value="Stable">Stable (Releases only)</option>
          <option value="Beta">Beta (Includes -beta prereleases)</option>
          <option value="Nightly">Nightly (Includes -nightly prereleases)</option>
        </select>
      </div>

      <div style={{ marginTop: '1rem', maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
        {loading ? (
          <div style={{ padding: '1rem', textAlign: 'center' }}>Loading releases...</div>
        ) : releases.length === 0 ? (
          <div style={{ padding: '1rem', textAlign: 'center' }}>No releases found.</div>
        ) : (
          <table className={styles.style23} style={{ margin: 0, width: '100%', border: 'none' }}>
            <thead>
              <tr className={styles.style24}>
                <th className={styles.style25} style={{ padding: '0.5rem 1rem' }}>Version</th>
                <th className={styles.style26} style={{ padding: '0.5rem 1rem' }}>Date</th>
                <th className={styles.style27} style={{ padding: '0.5rem 1rem' }}>Channel</th>
                <th className={styles.style28} style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {releases.map((r) => {
                const isStable = !r.prerelease && !r.tag_name.includes('-beta') && !r.tag_name.includes('-nightly');
                const isBeta = r.tag_name.includes('-beta');
                const isNightly = r.tag_name.includes('-nightly');
                const channelName = isStable ? 'Stable' : isBeta ? 'Beta' : isNightly ? 'Nightly' : 'Prerelease';
                
                const hasManifest = r.assets.some((a) => a.name === 'latest.json');

                return (
                  <tr key={r.tag_name} className={styles.style29}>
                    <td className={styles.style30} style={{ padding: '0.5rem 1rem', fontWeight: 500 }}>{r.tag_name}</td>
                    <td className={styles.style31} style={{ padding: '0.5rem 1rem' }}>
                      {r.published_at ? new Date(r.published_at).toLocaleDateString() : 'Unknown'}
                    </td>
                    <td className={styles.style35} style={{ padding: '0.5rem 1rem' }}>
                      <span className={`badge badge--${isStable ? 'success' : isBeta ? 'warning' : 'info'}`}>
                        {channelName}
                      </span>
                    </td>
                    <td className={styles.style39} style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn--secondary"
                        disabled={!hasManifest || installing === r.tag_name}
                        onClick={() => handleInstall(r)}
                      >
                        {installing === r.tag_name ? 'Installing...' : hasManifest ? 'Install' : 'Unavailable'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
