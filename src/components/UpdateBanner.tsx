import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store';

interface UpdateInfo {
  version: string;
  release_notes: string;
  date: string;
  latest_json_url: string;
  channel: string;
}

export function UpdateBanner() {
  const { updateChannel, addToast, setCurrentView } = useAppStore();
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Only check if we haven't dismissed
    if (dismissed) return;
    
    // Check for updates on mount
    checkForUpdates();
    
    // And check periodically every hour
    const interval = setInterval(checkForUpdates, 60 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateChannel, dismissed]);

  const checkForUpdates = async () => {
    try {
      const info: UpdateInfo | null = await invoke('check_updates', { channel: updateChannel });
      if (info) {
        // Compare with current version somehow, or assume the backend did the comparison
        // Actually since we bypass version_comparator in rust for manual install, we should
        // get the app version and compare it here, or just trust the backend to only return *new* updates?
        // Let's just show it. If it's already installed, the user can dismiss it.
        setUpdateInfo(info);
      }
    } catch (err) {
      console.error('Failed to check for updates', err);
    }
  };

  const handleInstall = async () => {
    if (!updateInfo) return;
    setInstalling(true);
    try {
      addToast('Downloading update...', 'info');
      await invoke('install_update', { url: updateInfo.latest_json_url });
      addToast('Update downloaded. Please restart the app to apply.', 'success');
      setDismissed(true);
    } catch (err) {
      console.error(err);
      addToast(`Failed to install update: ${err}`, 'error');
    } finally {
      setInstalling(false);
    }
  };

  if (!updateInfo || dismissed) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: 'var(--color-primary)',
      color: 'white',
      padding: '0.75rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      zIndex: 1000
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontWeight: 600 }}>Update Available: {updateInfo.version} ({updateInfo.channel})</span>
        <button 
          className="btn btn--secondary" 
          style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
          onClick={() => {
            setCurrentView('SETTINGS');
            setDismissed(true);
          }}
        >
          View Releases
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button 
          className="btn btn--primary" 
          style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
          onClick={handleInstall}
          disabled={installing}
        >
          {installing ? 'Installing...' : 'Install & Restart'}
        </button>
        <button 
          onClick={() => setDismissed(true)} 
          style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0.25rem', opacity: 0.8 }}
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
