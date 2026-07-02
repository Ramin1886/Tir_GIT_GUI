import { useEffect, useState } from 'react';
import { runGitCommand, listBranches } from '../api/git';
import { useAppStore } from '../store';

import styles from "./GitFlowView.module.css";

interface FlowBranch {
  name: string;
  shorthand: string;
  type: 'feature' | 'release' | 'hotfix';
}

export function GitFlowView() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logOutput, setLogOutput] = useState('');
  const [flowBranches, setFlowBranches] = useState<FlowBranch[]>([]);

  // Action fields
  const [featureName, setFeatureName] = useState('');
  const [releaseName, setReleaseName] = useState('');
  const [hotfixName, setHotfixName] = useState('');

  const { addToast } = useAppStore();

  const checkGitFlowStatus = async () => {
    try {
      setLoading(true);
      // Check if git config has gitflow values or develop branch exists
      const configRes = await runGitCommand(['config', '--get', 'gitflow.branch.master']).catch(() => '');
      const branches = await listBranches();
      const hasDevelop = branches.some((b) => b.shorthand === 'develop');
      const hasMain = branches.some((b) => b.shorthand === 'main' || b.shorthand === 'master');

      if (configRes.trim() || (hasDevelop && hasMain)) {
        setIsInitialized(true);
        // Categorize active branches
        const flowList: FlowBranch[] = [];
        branches.forEach((b) => {
          if (b.shorthand.startsWith('feature/')) {
            flowList.push({ name: b.name, shorthand: b.shorthand, type: 'feature' });
          } else if (b.shorthand.startsWith('release/')) {
            flowList.push({ name: b.name, shorthand: b.shorthand, type: 'release' });
          } else if (b.shorthand.startsWith('hotfix/')) {
            flowList.push({ name: b.name, shorthand: b.shorthand, type: 'hotfix' });
          }
        });
        setFlowBranches(flowList);
      } else {
        setIsInitialized(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkGitFlowStatus();
  }, []);

  const handleInit = async () => {
    try {
      setLoading(true);
      setLogOutput('Initializing Git Flow...\n');
      
      // Try calling git flow init
      try {
        const out = await runGitCommand(['flow', 'init', '-d']);
        setLogOutput((prev) => prev + out + '\nGit Flow Initialized successfully.\n');
        addToast('Git Flow Initialized', 'success');
        } catch {
        // Emulator fallback
        setLogOutput((prev) => prev + `System git-flow not found or failed. Emulating Git Flow...\n`);
        
        // 1. Check if develop exists, if not create it from current HEAD
        const branches = await listBranches();
        const mainBranch = branches.find(b => b.shorthand === 'main' || b.shorthand === 'master')?.shorthand || 'main';
        
        if (!branches.some(b => b.shorthand === 'develop')) {
          await runGitCommand(['branch', 'develop', mainBranch]);
          setLogOutput((prev) => prev + `Created branch 'develop' from '${mainBranch}'.\n`);
        }
        
        // 2. Configure gitconfig values for compatibility
        await runGitCommand(['config', 'gitflow.branch.master', mainBranch]);
        await runGitCommand(['config', 'gitflow.branch.develop', 'develop']);
        await runGitCommand(['config', 'gitflow.prefix.feature', 'feature/']);
        await runGitCommand(['config', 'gitflow.prefix.release', 'release/']);
        await runGitCommand(['config', 'gitflow.prefix.hotfix', 'hotfix/']);
        await runGitCommand(['config', 'gitflow.prefix.support', 'support/']);
        await runGitCommand(['config', 'gitflow.prefix.versiontag', 'v']);
        
        // Checkout develop branch
        await runGitCommand(['checkout', 'develop']);
        
        setLogOutput((prev) => prev + `Configured Git Flow branch tracking properties and checked out 'develop'.\n`);
        addToast('Git Flow Initialized (Emulated Mode)', 'success');
      }
      
      await checkGitFlowStatus();
    } catch (err) {
      setLogOutput((prev) => prev + `Initialization failed: ${String(err)}\n`);
      addToast(`Init failed: ${String(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartFeature = async () => {
    if (!featureName.trim()) return;
    const name = featureName.trim();
    try {
      setLoading(true);
      setLogOutput(`Starting feature: ${name}...\n`);
      try {
        const out = await runGitCommand(['flow', 'feature', 'start', name]);
        setLogOutput((prev) => prev + out);
        addToast(`Feature ${name} started`, 'success');
      } catch {
        // Emulate
        await runGitCommand(['checkout', 'develop']);
        await runGitCommand(['checkout', '-b', `feature/${name}`]);
        setLogOutput((prev) => prev + `Checked out new branch 'feature/${name}' from 'develop'.\n`);
        addToast(`Feature ${name} started (Emulated)`, 'success');
      }
      setFeatureName('');
      await checkGitFlowStatus();
    } catch (err) {
      setLogOutput((prev) => prev + `Failed: ${String(err)}\n`);
      addToast(`Failed: ${String(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishFeature = async (shorthand: string) => {
    const name = shorthand.replace('feature/', '');
    try {
      setLoading(true);
      setLogOutput(`Finishing feature: ${name}...\n`);
      try {
        const out = await runGitCommand(['flow', 'feature', 'finish', name]);
        setLogOutput((prev) => prev + out);
        addToast(`Feature ${name} finished`, 'success');
      } catch {
        // Emulate
        await runGitCommand(['checkout', 'develop']);
        await runGitCommand(['merge', '--no-ff', `feature/${name}`]);
        await runGitCommand(['branch', '-d', `feature/${name}`]);
        setLogOutput((prev) => prev + `Merged 'feature/${name}' into 'develop' and deleted branch.\n`);
        addToast(`Feature ${name} finished (Emulated)`, 'success');
      }
      await checkGitFlowStatus();
    } catch (err) {
      setLogOutput((prev) => prev + `Failed: ${String(err)}\n`);
      addToast(`Failed to finish feature: ${String(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartRelease = async () => {
    if (!releaseName.trim()) return;
    const name = releaseName.trim();
    try {
      setLoading(true);
      setLogOutput(`Starting release: ${name}...\n`);
      try {
        const out = await runGitCommand(['flow', 'release', 'start', name]);
        setLogOutput((prev) => prev + out);
        addToast(`Release ${name} started`, 'success');
      } catch {
        // Emulate
        await runGitCommand(['checkout', 'develop']);
        await runGitCommand(['checkout', '-b', `release/${name}`]);
        setLogOutput((prev) => prev + `Checked out new branch 'release/${name}' from 'develop'.\n`);
        addToast(`Release ${name} started (Emulated)`, 'success');
      }
      setReleaseName('');
      await checkGitFlowStatus();
    } catch (err) {
      setLogOutput((prev) => prev + `Failed: ${String(err)}\n`);
      addToast(`Failed: ${String(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishRelease = async (shorthand: string) => {
    const name = shorthand.replace('release/', '');
    try {
      setLoading(true);
      setLogOutput(`Finishing release: ${name}...\n`);
      try {
        const out = await runGitCommand(['flow', 'release', 'finish', '-m', `Release ${name}`, name]);
        setLogOutput((prev) => prev + out);
        addToast(`Release ${name} finished`, 'success');
      } catch {
        // Emulate
        const branches = await listBranches();
        const mainBranch = branches.find(b => b.shorthand === 'main' || b.shorthand === 'master')?.shorthand || 'main';
        
        await runGitCommand(['checkout', mainBranch]);
        await runGitCommand(['merge', '--no-ff', `release/${name}`]);
        await runGitCommand(['tag', '-a', `v${name}`, '-m', `Release ${name}`]);
        await runGitCommand(['checkout', 'develop']);
        await runGitCommand(['merge', '--no-ff', `release/${name}`]);
        await runGitCommand(['branch', '-d', `release/${name}`]);
        setLogOutput((prev) => prev + `Merged 'release/${name}' into '${mainBranch}' and 'develop', tagged as 'v${name}', and deleted branch.\n`);
        addToast(`Release ${name} finished (Emulated)`, 'success');
      }
      await checkGitFlowStatus();
    } catch (err) {
      setLogOutput((prev) => prev + `Failed: ${String(err)}\n`);
      addToast(`Failed: ${String(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartHotfix = async () => {
    if (!hotfixName.trim()) return;
    const name = hotfixName.trim();
    try {
      setLoading(true);
      setLogOutput(`Starting hotfix: ${name}...\n`);
      try {
        const out = await runGitCommand(['flow', 'hotfix', 'start', name]);
        setLogOutput((prev) => prev + out);
        addToast(`Hotfix ${name} started`, 'success');
      } catch {
        // Emulate
        const branches = await listBranches();
        const mainBranch = branches.find(b => b.shorthand === 'main' || b.shorthand === 'master')?.shorthand || 'main';
        await runGitCommand(['checkout', mainBranch]);
        await runGitCommand(['checkout', '-b', `hotfix/${name}`]);
        setLogOutput((prev) => prev + `Checked out new hotfix branch 'hotfix/${name}' from '${mainBranch}'.\n`);
        addToast(`Hotfix ${name} started (Emulated)`, 'success');
      }
      setHotfixName('');
      await checkGitFlowStatus();
    } catch (err) {
      setLogOutput((prev) => prev + `Failed: ${String(err)}\n`);
      addToast(`Failed: ${String(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishHotfix = async (shorthand: string) => {
    const name = shorthand.replace('hotfix/', '');
    try {
      setLoading(true);
      setLogOutput(`Finishing hotfix: ${name}...\n`);
      try {
        const out = await runGitCommand(['flow', 'hotfix', 'finish', '-m', `Hotfix ${name}`, name]);
        setLogOutput((prev) => prev + out);
        addToast(`Hotfix ${name} finished`, 'success');
      } catch {
        // Emulate
        const branches = await listBranches();
        const mainBranch = branches.find(b => b.shorthand === 'main' || b.shorthand === 'master')?.shorthand || 'main';
        
        await runGitCommand(['checkout', mainBranch]);
        await runGitCommand(['merge', '--no-ff', `hotfix/${name}`]);
        await runGitCommand(['tag', '-a', `v${name}`, '-m', `Hotfix ${name}`]);
        await runGitCommand(['checkout', 'develop']);
        await runGitCommand(['merge', '--no-ff', `hotfix/${name}`]);
        await runGitCommand(['branch', '-d', `hotfix/${name}`]);
        setLogOutput((prev) => prev + `Merged 'hotfix/${name}' into '${mainBranch}' and 'develop', tagged as 'v${name}', and deleted branch.\n`);
        addToast(`Hotfix ${name} finished (Emulated)`, 'success');
      }
      await checkGitFlowStatus();
    } catch (err) {
      setLogOutput((prev) => prev + `Failed: ${String(err)}\n`);
      addToast(`Failed: ${String(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && flowBranches.length === 0 && !isInitialized) {
    return (
      <div className={styles.style1}>
        <h2>Git Flow</h2>
        <p>Loading status...</p>
      </div>
    );
  }

  return (
    <div className="git-flow-view">
      <div className="settings-view__header">
        <h2 className="settings-view__title">Git Flow Integration</h2>
      </div>
      <div className="settings-view__content">
        <div className={styles.style4}>
          {!isInitialized ? (
            <div className="settings-card">
              <h3 className="settings-card__title">Not Initialized</h3>
              <p className="settings-card__description">
                Git Flow is not yet configured or initialized for this repository. Git Flow structures branches using separate lanes for production releases (master/main) and active development (develop).
              </p>
              <button className="btn btn--primary" onClick={handleInit}>
                Initialize Git Flow
              </button>
            </div>
          ) : (
            <>
              {/* Features Section */}
              <div className="settings-card">
                <h3 className="settings-card__title">Features</h3>
                <p className="settings-card__description">Develop new features starting from the develop branch.</p>
                <div className={styles.style6}>
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="Feature name..."
                    value={featureName}
                    onChange={(e) => setFeatureName(e.target.value)}
                  />
                  <button className="btn btn--primary" onClick={handleStartFeature}>Start</button>
                </div>

                {flowBranches.filter(b => b.type === 'feature').length > 0 && (
                  <div className={styles.style7}>
                    <h4 className={styles.style8}>Active Features</h4>
                    {flowBranches.filter(b => b.type === 'feature').map((b) => (
                      <div key={b.name} className={styles.style9}>
                        <span className={styles.style10}>{b.shorthand}</span>
                        <button
                          className="btn btn--secondary"
                          onClick={() => handleFinishFeature(b.shorthand)}>Finish</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Releases Section */}
              <div className="settings-card">
                <h3 className="settings-card__title">Releases</h3>
                <p className="settings-card__description">Prepare a release branch for production deployment tagging.</p>
                <div className={styles.style12}>
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="e.g. 1.0.0"
                    value={releaseName}
                    onChange={(e) => setReleaseName(e.target.value)}
                  />
                  <button className="btn btn--primary" onClick={handleStartRelease}>Start</button>
                </div>

                {flowBranches.filter(b => b.type === 'release').length > 0 && (
                  <div className={styles.style13}>
                    <h4 className={styles.style14}>Active Releases</h4>
                    {flowBranches.filter(b => b.type === 'release').map((b) => (
                      <div key={b.name} className={styles.style15}>
                        <span className={styles.style16}>{b.shorthand}</span>
                        <button
                          className="btn btn--secondary"
                          onClick={() => handleFinishRelease(b.shorthand)}>Finish</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hotfixes Section */}
              <div className="settings-card">
                <h3 className="settings-card__title">Hotfixes</h3>
                <p className="settings-card__description">Surgically patch master/main branches to fix production bugs.</p>
                <div className={styles.style18}>
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="Hotfix name or version..."
                    value={hotfixName}
                    onChange={(e) => setHotfixName(e.target.value)}
                  />
                  <button className="btn btn--primary" onClick={handleStartHotfix}>Start</button>
                </div>

                {flowBranches.filter(b => b.type === 'hotfix').length > 0 && (
                  <div className={styles.style19}>
                    <h4 className={styles.style20}>Active Hotfixes</h4>
                    {flowBranches.filter(b => b.type === 'hotfix').map((b) => (
                      <div key={b.name} className={styles.style21}>
                        <span className={styles.style22}>{b.shorthand}</span>
                        <button
                          className="btn btn--secondary"
                          onClick={() => handleFinishHotfix(b.shorthand)}>Finish</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className={styles.style24}>
          <div className="settings-card">
            <h3 className="settings-card__title">Git Flow Terminal Output</h3>
            <pre className="git-output-pre">
              {logOutput || 'Console ready. Execute a Git Flow action to view details...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
