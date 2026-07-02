import { useEffect, useState, useCallback } from 'react';
import { listRemotes, runGitCommand, checkoutBranch } from '../api/git';
import { useAppStore } from '../store';

import styles from "./PullRequestsView.module.css";

interface PullRequest {
  id: number;
  number: number;
  title: string;
  author: string;
  authorAvatar: string;
  sourceBranch: string;
  targetBranch: string;
  state: string;
  url: string;
  createdAt: string;
}

export function PullRequestsView() {
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repoDetails, setRepoDetails] = useState<{ owner: string; repo: string; host: string } | null>(null);

  const { githubToken, gitlabToken, gitlabApiUrl, addToast } = useAppStore();

  const parseRemoteUrl = (url: string) => {
    const regex = /(?:git@|https:\/\/)([^:/]+)[:/]([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\.git)?/;
    const match = url.match(regex);
    if (!match) return null;
    
    const host = match[1];
    const owner = match[2];
    const repo = match[3].replace(/\.git$/, '');
    
    // Determine host type
    let hostType = 'unknown';
    if (host.includes('github')) {
      hostType = 'github';
    } else if (host.includes('gitlab') || (gitlabApiUrl && gitlabApiUrl.includes(host))) {
      hostType = 'gitlab';
    }
    
    if (hostType === 'unknown') return null;
    return { owner, repo, host: hostType, rawHost: host };
  };

  const fetchPRs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const remotes = await listRemotes();
      const origin = remotes.find((r) => r.name === 'origin') || remotes[0];
      if (!origin || !origin.url) {
        setError('No remote origin URL configured to fetch Pull Requests.');
        setLoading(false);
        return;
      }

      const parsed = parseRemoteUrl(origin.url);
      if (!parsed) {
        setError('Remote hosting provider not recognized (GitHub/GitLab supported).');
        setLoading(false);
        return;
      }

      setRepoDetails(parsed);

      const headers: HeadersInit = {};
      let fetchUrl = '';

      if (parsed.host === 'github') {
        if (githubToken) {
          headers['Authorization'] = `token ${githubToken}`;
        }
        // Support GitHub Enterprise if rawHost is not github.com
        const baseUrl = parsed.rawHost === 'github.com' ? 'https://api.github.com' : `https://${parsed.rawHost}/api/v3`;
        fetchUrl = `${baseUrl}/repos/${parsed.owner}/${parsed.repo}/pulls?state=open`;
      } else if (parsed.host === 'gitlab') {
        if (gitlabToken) {
          headers['PRIVATE-TOKEN'] = gitlabToken;
        }
        const baseUrl = gitlabApiUrl || 'https://gitlab.com';
        // Ensure baseUrl doesn't end with a slash, and typically ends with /api/v4, but user might just provide the base host
        const apiBase = baseUrl.endsWith('/api/v4') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/api/v4`;
        fetchUrl = `${apiBase}/projects/${encodeURIComponent(parsed.owner + '/' + parsed.repo)}/merge_requests?state=opened`;
      }

      const response = await fetch(fetchUrl, { headers });
      if (!response.ok) {
        throw new Error(`Hosting provider returned status ${response.status}`);
      }

      const data = await response.json();
      const mappedPRs: PullRequest[] = [];

      if (parsed.host === 'github') {
        data.forEach((item: { id: number; number: number; title: string; user?: { login: string; avatar_url: string }; head?: { ref: string }; base?: { ref: string }; state: string; html_url: string; created_at: string }) => {
          mappedPRs.push({
            id: item.id,
            number: item.number,
            title: item.title,
            author: item.user?.login || 'Unknown',
            authorAvatar: item.user?.avatar_url || '',
            sourceBranch: item.head?.ref || '',
            targetBranch: item.base?.ref || '',
            state: item.state,
            url: item.html_url,
            createdAt: new Date(item.created_at).toLocaleDateString(),
          });
        });
      } else if (parsed.host === 'gitlab') {
        data.forEach((item: { id: number; iid: number; title: string; author?: { username: string; avatar_url: string }; source_branch: string; target_branch: string; state: string; web_url: string; created_at: string }) => {
          mappedPRs.push({
            id: item.id,
            number: item.iid,
            title: item.title,
            author: item.author?.username || 'Unknown',
            authorAvatar: item.author?.avatar_url || '',
            sourceBranch: item.source_branch || '',
            targetBranch: item.target_branch || '',
            state: item.state,
            url: item.web_url,
            createdAt: new Date(item.created_at).toLocaleDateString(),
          });
        });
      }

      setPrs(mappedPRs);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [githubToken, gitlabToken]);

  useEffect(() => {
    fetchPRs();
  }, [fetchPRs]);

  const handleCheckoutPR = async (prNumber: number, sourceBranch: string) => {
    const localBranchName = `pr/${prNumber}`;
    try {
      addToast(`Fetching Pull Request #${prNumber}...`, 'info');
      // Fetch the PR reference
      await runGitCommand(['fetch', 'origin', `pull/${prNumber}/head:${localBranchName}`]);
      addToast(`Switching to local branch "${localBranchName}"...`, 'info');
      await checkoutBranch(localBranchName, false);
      addToast(`Successfully checked out Pull Request #${prNumber} locally`, 'success');
    } catch (err) {
      // For GitLab or if pull fetch fails, try checking out sourceBranch directly if it exists locally or on remote
      try {
        addToast(`Fallback: checking out source branch "${sourceBranch}"...`, 'info');
        await checkoutBranch(sourceBranch, false);
        addToast(`Switched to branch "${sourceBranch}"`, 'success');
      } catch {
        addToast(`Failed to checkout PR branch: ${String(err)}`, 'error');
      }
    }
  };

  return (
    <div className="pull-requests-view">
      <div className={styles.style2}>
        <div>
          <h2 className={styles.style3}>Pull Requests</h2>
          {repoDetails && (
            <span className={styles.style4}>
              Connected to {repoDetails.host === 'github' ? 'GitHub' : 'GitLab'}: {repoDetails.owner}/{repoDetails.repo}
            </span>
          )}
        </div>
        <button className="btn btn--secondary" onClick={fetchPRs} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      <div className={styles.style5}>
        {error && (
          <div className={styles.style6}>
            Error loading PRs: {error}
          </div>
        )}

        {loading ? (
          <div className={styles.style7}>
            Loading Pull Requests from remote...
          </div>
        ) : prs.length === 0 ? (
          <div className={styles.style8}>
            No open Pull Requests found for this repository.
          </div>
        ) : (
          <div className={styles.style9}>
            {prs.map((pr) => (
              <div
                key={pr.id}
                className={styles.style10}
              >
                <div className={styles.style11}>
                  {pr.authorAvatar && (
                    <img
                      src={pr.authorAvatar}
                      alt={pr.author}
                      className={styles.style12}
                    />
                  )}
                  <div className={styles.style13}>
                    <div className={styles.style14}>
                      <span className={styles.style15}>
                        {pr.title}
                      </span>
                      <span className={styles.style16}>
                        #{pr.number}
                      </span>
                    </div>
                    <div className={styles.style17}>
                      <span>by @{pr.author}</span>
                      <span>•</span>
                      <span>created {pr.createdAt}</span>
                      <span>•</span>
                      <span className={styles.style18}>
                        {pr.sourceBranch} → {pr.targetBranch}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.style19}>
                  <a
                    href={pr.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn--secondary">
                    Open Web
                  </a>
                  <button
                    className="btn btn--primary"
                    onClick={() => handleCheckoutPR(pr.number, pr.sourceBranch)}>
                    Checkout Local
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
