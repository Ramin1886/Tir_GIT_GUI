import { describe, it, expect } from 'vitest';
import { computeDag, parseRemoteUrl } from './historyUtils';
import { CommitInfo } from '../../api/git';

describe('historyUtils', () => {
  describe('parseRemoteUrl', () => {
    it('should parse GitHub SSH URLs', () => {
      const result = parseRemoteUrl('git@github.com:facebook/react.git');
      expect(result).toEqual({ host: 'github.com', owner: 'facebook', repo: 'react' });
    });

    it('should parse GitLab HTTPS URLs', () => {
      const result = parseRemoteUrl('https://gitlab.com/gitlab-org/gitlab.git');
      expect(result).toEqual({ host: 'gitlab.com', owner: 'gitlab-org', repo: 'gitlab' });
    });

    it('should parse enterprise SSH URLs', () => {
      const result = parseRemoteUrl('git@my-enterprise-github.internal:team/project.git');
      expect(result).toEqual({ host: 'my-enterprise-github.internal', owner: 'team', repo: 'project' });
    });

    it('should return null for invalid URLs', () => {
      const result = parseRemoteUrl('invalid-url');
      expect(result).toEqual({ host: null, owner: '', repo: '' });
    });
  });

  describe('computeDag', () => {
    const createMockCommit = (id: string, parents: string[]): CommitInfo => ({
      id,
      parents,
      message: `Commit ${id}`,
      author: 'Test',
      email: 'test@example.com',
      time: 0
    });

    it('should handle a linear history', () => {
      const commits = [
        createMockCommit('3', ['2']),
        createMockCommit('2', ['1']),
        createMockCommit('1', []),
      ];

      const dagMap = computeDag(commits);
      
      expect(dagMap.size).toBe(3);
      expect(dagMap.get('3')?.lane).toBe(0);
      expect(dagMap.get('2')?.lane).toBe(0);
      expect(dagMap.get('1')?.lane).toBe(0);
      
      // Node 3 connects to Node 2 on lane 0
      expect(dagMap.get('3')?.routes).toContainEqual(expect.objectContaining({ from: 0, to: 0 }));
    });

    it('should handle a simple merge', () => {
      // 4 (merge 2 and 3) -> 2, 3
      // 3 -> 1
      // 2 -> 1
      // 1 -> []
      const commits = [
        createMockCommit('4', ['3', '2']),
        createMockCommit('3', ['1']),
        createMockCommit('2', ['1']),
        createMockCommit('1', []),
      ];

      const dagMap = computeDag(commits);
      
      expect(dagMap.get('4')?.lane).toBe(0);
      // It should create multiple lanes for parents
      expect(dagMap.get('3')?.lane).toBe(0); // first parent continues on lane 0
      expect(dagMap.get('2')?.lane).toBe(1); // second parent goes to lane 1
      expect(dagMap.get('1')?.lane).toBe(0);
      
      // Routes from merge commit
      const routes4 = dagMap.get('4')?.routes || [];
      expect(routes4).toEqual(expect.arrayContaining([
        expect.objectContaining({ from: 0, to: 0 }),
        expect.objectContaining({ from: 0, to: 1 })
      ]));
    });

    it('should handle disjoint histories (orphan branches)', () => {
      const commits = [
        createMockCommit('A2', ['A1']),
        createMockCommit('A1', []),
        createMockCommit('B2', ['B1']),
        createMockCommit('B1', []),
      ];

      const dagMap = computeDag(commits);
      expect(dagMap.size).toBe(4);
      // The exact lane assignment can vary depending on implementation, but they shouldn't cross routes inappropriately
      expect(dagMap.get('A2')?.lane).toBe(0);
      expect(dagMap.get('B2')?.lane).toBe(0); // It reuses the lane because A1 ended
    });
  });
});
