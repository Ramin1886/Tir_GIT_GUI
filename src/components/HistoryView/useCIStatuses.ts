import { useState, useCallback } from 'react';
import { CommitInfo, listRemotes } from '../../api/git';
import { useAppStore } from '../../store';
import { parseRemoteUrl } from './historyUtils';

export function useCIStatuses() {
  const { githubToken, gitlabToken } = useAppStore();
  const [ciStatuses, setCIStatuses] = useState<Map<string, 'success' | 'failure' | 'pending' | null>>(new Map());

  const fetchCIStatuses = useCallback(async (commitsList: CommitInfo[]) => {
    try {
      const remotes = await listRemotes();
      const origin = remotes.find(r => r.name === 'origin') || remotes[0];
      if (!origin || !origin.url) return;
      const parsed = parseRemoteUrl(origin.url);
      if (!parsed.host) return;

      const headers: HeadersInit = {};
      
      // Determine if GitHub or GitLab API based on host or token provided (simple heuristic if enterprise)
      let apiType: 'github' | 'gitlab' | null = null;
      if (parsed.host === 'github.com' || parsed.host.includes('github')) {
        apiType = 'github';
        if (githubToken) headers['Authorization'] = `token ${githubToken}`;
      } else if (parsed.host === 'gitlab.com' || parsed.host.includes('gitlab')) {
        apiType = 'gitlab';
        if (gitlabToken) headers['PRIVATE-TOKEN'] = gitlabToken;
      }

      if (!apiType) return;

      const topCommits = commitsList.slice(0, 15);
      const newCI = new Map(ciStatuses);

      await Promise.all(topCommits.map(async (c) => {
        if (newCI.has(c.id)) return;
        try {
          if (apiType === 'github') {
            // Support GitHub Enterprise
            const baseUrl = parsed.host === 'github.com' 
              ? 'https://api.github.com'
              : `https://${parsed.host}/api/v3`;
            const url = `${baseUrl}/repos/${parsed.owner}/${parsed.repo}/commits/${c.id}/check-runs`;
            
            const resp = await fetch(url, { headers });
            if (resp.ok) {
              const data = await resp.json();
              const runs = data.check_runs || [];
              if (runs.length > 0) {
                const failed = runs.some((r: { conclusion: string; status: string }) => r.conclusion === 'failure');
                const inProgress = runs.some((r: { conclusion: string; status: string }) => r.status === 'in_progress' || r.status === 'queued');
                if (failed) newCI.set(c.id, 'failure');
                else if (inProgress) newCI.set(c.id, 'pending');
                else newCI.set(c.id, 'success');
              }
            }
          } else if (apiType === 'gitlab') {
            // Support GitLab Enterprise
            const baseUrl = `https://${parsed.host}/api/v4`;
            const url = `${baseUrl}/projects/${encodeURIComponent(parsed.owner + '/' + parsed.repo)}/repository/commits/${c.id}/statuses`;
            
            const resp = await fetch(url, { headers });
            if (resp.ok) {
              const runs = await resp.json();
              if (runs.length > 0) {
                const failed = runs.some((r: { status: string }) => r.status === 'failed');
                const inProgress = runs.some((r: { status: string }) => r.status === 'running' || r.status === 'pending');
                if (failed) newCI.set(c.id, 'failure');
                else if (inProgress) newCI.set(c.id, 'pending');
                else newCI.set(c.id, 'success');
              }
            }
          }
        } catch {}
      }));

      setCIStatuses(newCI);
    } catch {}
  }, [ciStatuses, githubToken, gitlabToken]);

  return { ciStatuses, fetchCIStatuses, setCIStatuses };
}
