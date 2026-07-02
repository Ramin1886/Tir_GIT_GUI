import { CommitInfo } from '../../api/git';

export interface Route {
  from: number;
  to: number;
  color: string;
}

export interface DagNode {
  id: string;
  lane: number;
  routes: Route[];
  activeLanesCount: number;
}

export function computeDag(commits: CommitInfo[]): Map<string, DagNode> {
  const dagMap = new Map<string, DagNode>();
  let activeLanes: (string | null)[] = [];
  const laneColors = [
    '#01696f', // Teal accent
    '#0969da', // Blue
    '#2da44e', // Green
    '#bf8700', // Yellow
    '#cf222e', // Red
    '#8250df', // Purple
    '#ef5b2b', // Orange
  ];

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];
    const id = commit.id;
    
    let lane = activeLanes.indexOf(id);
    if (lane === -1) {
      lane = activeLanes.indexOf(null);
      if (lane === -1) {
        lane = activeLanes.length;
        activeLanes.push(id);
      } else {
        activeLanes[lane] = id;
      }
    }
    
    const routes: Route[] = [];
    const parents = commit.parents || [];
    
    activeLanes[lane] = null;
    
    parents.forEach((parentId) => {
      let pLane = activeLanes.indexOf(parentId);
      if (pLane === -1) {
        pLane = activeLanes.indexOf(null);
        if (pLane === -1) {
          pLane = activeLanes.length;
          activeLanes.push(parentId);
        } else {
          activeLanes[pLane] = parentId;
        }
      }
      
      routes.push({
        from: lane,
        to: pLane,
        color: laneColors[lane % laneColors.length],
      });
    });
    
    while (activeLanes.length > 0 && activeLanes[activeLanes.length - 1] === null) {
      activeLanes.pop();
    }
    
    for (let l = 0; l < activeLanes.length; l++) {
      const activeId = activeLanes[l];
      if (activeId && activeId !== id) {
        routes.push({
          from: l,
          to: l,
          color: laneColors[l % laneColors.length],
        });
      }
    }

    dagMap.set(id, {
      id,
      lane,
      routes,
      activeLanesCount: Math.max(lane + 1, activeLanes.length),
    });
  }
  
  return dagMap;
}

export function parseRemoteUrl(url: string): { owner: string; repo: string; host: string | null } {
  // Matches generic SSH (git@hostname:owner/repo.git) or HTTPS (https://hostname/owner/repo.git)
  const regex = /(?:git@|https:\/\/)([^:/]+)[:/]([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\.git)?/;
  const match = url.match(regex);
  if (match) {
    return { host: match[1], owner: match[2], repo: match[3].replace(/\.git$/, '') };
  }
  return { owner: '', repo: '', host: null };
}
