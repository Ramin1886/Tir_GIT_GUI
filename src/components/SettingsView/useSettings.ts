import { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import {
  loadToolsConfig,
  saveToolsConfig,
  detectInstalledTools,
  testToolCommand,
  runGitCommand,
  ToolsConfig
} from '../../api/git';

export function useSettings() {
  const {
    theme,
    defaultRepoPath,
    autoRefreshInterval,
    githubToken,
    gitlabToken,
    setTheme,
    setDefaultRepoPath,
    setAutoRefreshInterval,
    setGitHubToken,
    setGitLabToken,
    addToast,
  } = useAppStore();

  const [repoPathInput, setRepoPathInput] = useState(defaultRepoPath);
  const [ghTokenInput, setGhTokenInput] = useState(githubToken || '');
  const [glTokenInput, setGlTokenInput] = useState(gitlabToken || '');
  const [toolsConfig, setToolsConfig] = useState<ToolsConfig | null>(null);
  const [newExtension, setNewExtension] = useState('');
  
  // Git profile configuration state
  const [gitName, setGitName] = useState('');
  const [gitEmail, setGitEmail] = useState('');
  const [gitGpgSign, setGitGpgSign] = useState(false);
  const [gitConfigLoading, setGitConfigLoading] = useState(false);

  useEffect(() => {
    setGhTokenInput(githubToken || '');
  }, [githubToken]);

  useEffect(() => {
    setGlTokenInput(gitlabToken || '');
  }, [gitlabToken]);

  const handleSaveIntegrations = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setGitHubToken(ghTokenInput.trim() || null);
      await setGitLabToken(glTokenInput.trim() || null);
      addToast('Integrations credentials updated successfully', 'success');
    } catch (err) {
      addToast(`Failed to save integrations credentials: ${String(err)}`, 'error');
    }
  };

  // LFS States
  const [lfsVersion, setLfsVersion] = useState<string | null>(null);
  const [lfsTrackedPatterns, setLfsTrackedPatterns] = useState<string[]>([]);
  const [lfsLocks, setLfsLocks] = useState<string[]>([]);
  const [newLfsPattern, setNewLfsPattern] = useState('');
  const [lfsLoading, setLfsLoading] = useState(false);

  const checkLfsStatus = async () => {
    try {
      const ver = await runGitCommand(['lfs', '--version']);
      setLfsVersion(ver.split('\n')[0]);
      
      const trackOutput = await runGitCommand(['lfs', 'track']);
      const patterns = trackOutput
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => line.trim());
      setLfsTrackedPatterns(patterns.length > 0 ? patterns : ['No patterns tracked.']);

      const locksOutput = await runGitCommand(['lfs', 'locks']);
      const locks = locksOutput.split('\n').filter((line) => line.trim() !== '');
      setLfsLocks(locks.length > 0 ? locks : ['No active locks.']);
    } catch {
      setLfsVersion('Not Installed or Init Required');
    }
  };

  useEffect(() => {
    checkLfsStatus();
  }, []);

  const handleTrackLfsPattern = async (e: React.FormEvent) => {
    e.preventDefault();
    const pattern = newLfsPattern.trim();
    if (!pattern) return;
    setLfsLoading(true);
    try {
      await runGitCommand(['lfs', 'track', pattern]);
      addToast(`Tracking pattern "${pattern}" in Git LFS`, 'success');
      setNewLfsPattern('');
      checkLfsStatus();
    } catch (err) {
      addToast(`Failed to track pattern: ${String(err)}`, 'error');
    } finally {
      setLfsLoading(false);
    }
  };

  const handleLfsPush = async () => {
    setLfsLoading(true);
    try {
      addToast('Pushing LFS assets to origin...', 'info');
      await runGitCommand(['lfs', 'push', 'origin', '--all']);
      addToast('Successfully pushed all LFS assets', 'success');
    } catch (err) {
      addToast(`Failed to push LFS assets: ${String(err)}`, 'error');
    } finally {
      setLfsLoading(false);
    }
  };

  const loadGitConfig = async () => {
    try {
      const name = await runGitCommand(['config', 'user.name']).catch(() => '');
      const email = await runGitCommand(['config', 'user.email']).catch(() => '');
      const gpg = await runGitCommand(['config', 'commit.gpgsign']).catch(() => 'false');
      setGitName(name.trim());
      setGitEmail(email.trim());
      setGitGpgSign(gpg.trim() === 'true');
    } catch (err) {
      console.error('Failed to load Git config:', err);
    }
  };

  useEffect(() => {
    loadGitConfig();
  }, []);

  const handleSaveGitConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setGitConfigLoading(true);
    try {
      await runGitCommand(['config', 'user.name', gitName.trim()]);
      await runGitCommand(['config', 'user.email', gitEmail.trim()]);
      await runGitCommand(['config', 'commit.gpgsign', gitGpgSign ? 'true' : 'false']);
      addToast('Git profile and GPG configuration updated successfully', 'success');
      loadGitConfig();
    } catch (err) {
      addToast(`Failed to save Git config: ${String(err)}`, 'error');
    } finally {
      setGitConfigLoading(false);
    }
  };

  // Load config on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await loadToolsConfig();
        setToolsConfig(config);
      } catch (err) {
        addToast(`Failed to load tools config: ${String(err)}`, 'error');
      }
    }
    loadConfig();
  }, [addToast]);

  const handleThemeChange = async (newTheme: 'system' | 'light' | 'dark') => {
    try {
      await setTheme(newTheme);
      addToast(`Theme set to ${newTheme}`, 'success');
    } catch (e) {
      addToast(`Failed to save theme: ${String(e)}`, 'error');
    }
  };

  const handleIntervalChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value, 10);
    try {
      await setAutoRefreshInterval(val);
      addToast('Refresh interval updated', 'success');
    } catch (e) {
      addToast(`Failed to save interval: ${String(e)}`, 'error');
    }
  };

  const handleSaveRepoPath = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDefaultRepoPath(repoPathInput.trim());
      addToast('Default repository path updated', 'success');
    } catch (e) {
      addToast(`Failed to save repository path: ${String(e)}`, 'error');
    }
  };

  const handleUpdateDefaultTool = (type: 'diff' | 'merge', value: string) => {
    if (!toolsConfig) return;
    const updated = {
      ...toolsConfig,
      default: {
        ...toolsConfig.default,
        [type]: value || null,
      },
    };
    setToolsConfig(updated);
  };

  const handleUpdateExtensionTool = (ext: string, type: 'diff' | 'merge', value: string) => {
    if (!toolsConfig) return;
    const updated = {
      ...toolsConfig,
      extensions: {
        ...toolsConfig.extensions,
        [ext]: {
          ...toolsConfig.extensions[ext],
          [type]: value || null,
        },
      },
    };
    setToolsConfig(updated);
  };

  const handleSaveTools = async () => {
    if (!toolsConfig) return;
    try {
      await saveToolsConfig(toolsConfig);
      addToast('External tools config saved successfully', 'success');
    } catch (err) {
      addToast(`Failed to save tools config: ${String(err)}`, 'error');
    }
  };

  const handleAddExtension = () => {
    if (!toolsConfig || !newExtension.trim()) return;
    const ext = newExtension.trim().toLowerCase().replace(/^\./, '');
    if (toolsConfig.extensions[ext]) {
      addToast(`Extension .${ext} is already overridden`, 'error');
      return;
    }
    const updated = {
      ...toolsConfig,
      extensions: {
        ...toolsConfig.extensions,
        [ext]: {
          diff: '',
          merge: '',
        },
      },
    };
    setToolsConfig(updated);
    setNewExtension('');
  };

  const handleRemoveExtension = (ext: string) => {
    if (!toolsConfig) return;
    const updatedExtensions = { ...toolsConfig.extensions };
    delete updatedExtensions[ext];
    const updated = {
      ...toolsConfig,
      extensions: updatedExtensions,
    };
    setToolsConfig(updated);
  };

  const handleDetectTools = async () => {
    try {
      const detected = await detectInstalledTools();
      setToolsConfig(detected);
      addToast('Installed tools detected. Save to persist.', 'success');
    } catch (err) {
      addToast(`Failed to detect tools: ${String(err)}`, 'error');
    }
  };

  const handleTestTool = async (commandStr: string | null) => {
    if (!commandStr || !commandStr.trim()) {
      addToast('Please enter a command to test', 'error');
      return;
    }
    try {
      await testToolCommand(commandStr);
      addToast('Launched test command. Check for external window.', 'info');
    } catch (err) {
      addToast(`Failed to launch tool: ${String(err)}`, 'error');
    }
  };

  return {
    repoPathInput,
    setRepoPathInput,
    ghTokenInput,
    setGhTokenInput,
    glTokenInput,
    setGlTokenInput,
    toolsConfig,
    setToolsConfig,
    newExtension,
    setNewExtension,
    gitName,
    setGitName,
    gitEmail,
    setGitEmail,
    gitGpgSign,
    setGitGpgSign,
    gitConfigLoading,
    setGitConfigLoading,
    handleSaveIntegrations,
    lfsVersion,
    setLfsVersion,
    lfsTrackedPatterns,
    setLfsTrackedPatterns,
    lfsLocks,
    setLfsLocks,
    newLfsPattern,
    setNewLfsPattern,
    lfsLoading,
    setLfsLoading,
    checkLfsStatus,
    handleTrackLfsPattern,
    handleLfsPush,
    loadGitConfig,
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
    defaultRepoPath,
    autoRefreshInterval
  };
}
