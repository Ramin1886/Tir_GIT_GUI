import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import {
  openRepository,
  createBranch,
  deleteBranch,
  checkoutBranch,
  createCommit,
  discardFileChanges,
  dropStash,
  deleteTag,
  rebaseAbort,
  revertCommit,
  cherryPick,
} from './git';

const mockedInvoke = vi.mocked(invoke);

beforeEach(() => {
  mockedInvoke.mockReset();
});

describe('openRepository', () => {
  it('calls invoke with correct command and params', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined);
    await openRepository('/path/to/repo');
    expect(mockedInvoke).toHaveBeenCalledWith('open_repository', { path: '/path/to/repo' });
  });

  it('propagates errors from invoke', async () => {
    mockedInvoke.mockRejectedValueOnce(new Error('repo not found'));
    await expect(openRepository('/bad/path')).rejects.toThrow('repo not found');
  });
});

describe('createBranch', () => {
  it('calls invoke with branchName only', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined);
    await createBranch('feature/new');
    expect(mockedInvoke).toHaveBeenCalledWith('create_branch', {
      branchName: 'feature/new',
      startPoint: null,
    });
  });

  it('calls invoke with branchName and startPoint', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined);
    await createBranch('feature/new', 'abc123');
    expect(mockedInvoke).toHaveBeenCalledWith('create_branch', {
      branchName: 'feature/new',
      startPoint: 'abc123',
    });
  });

  it('propagates errors from invoke', async () => {
    mockedInvoke.mockRejectedValueOnce(new Error('branch exists'));
    await expect(createBranch('main')).rejects.toThrow('branch exists');
  });
});

describe('deleteBranch', () => {
  it('calls invoke with correct params', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined);
    await deleteBranch('old-branch');
    expect(mockedInvoke).toHaveBeenCalledWith('delete_branch', { branchName: 'old-branch' });
  });

  it('propagates errors from invoke', async () => {
    mockedInvoke.mockRejectedValueOnce(new Error('cannot delete current'));
    await expect(deleteBranch('main')).rejects.toThrow('cannot delete current');
  });
});

describe('checkoutBranch', () => {
  it('calls invoke with default force=false', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined);
    await checkoutBranch('develop');
    expect(mockedInvoke).toHaveBeenCalledWith('checkout_branch', {
      branchName: 'develop',
      force: false,
    });
  });

  it('calls invoke with force=true', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined);
    await checkoutBranch('develop', true);
    expect(mockedInvoke).toHaveBeenCalledWith('checkout_branch', {
      branchName: 'develop',
      force: true,
    });
  });

  it('propagates errors from invoke', async () => {
    mockedInvoke.mockRejectedValueOnce(new Error('checkout conflict'));
    await expect(checkoutBranch('main')).rejects.toThrow('checkout conflict');
  });
});

describe('createCommit', () => {
  it('calls invoke with default amend=false', async () => {
    mockedInvoke.mockResolvedValueOnce('abc123');
    const result = await createCommit('fix: bug');
    expect(mockedInvoke).toHaveBeenCalledWith('create_commit', {
      message: 'fix: bug',
      amend: false,
    });
    expect(result).toBe('abc123');
  });

  it('calls invoke with amend=true', async () => {
    mockedInvoke.mockResolvedValueOnce('def456');
    const result = await createCommit('fix: amended', true);
    expect(mockedInvoke).toHaveBeenCalledWith('create_commit', {
      message: 'fix: amended',
      amend: true,
    });
    expect(result).toBe('def456');
  });

  it('propagates errors from invoke', async () => {
    mockedInvoke.mockRejectedValueOnce(new Error('nothing to commit'));
    await expect(createCommit('empty')).rejects.toThrow('nothing to commit');
  });
});

describe('discardFileChanges', () => {
  it('calls invoke with correct params', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined);
    await discardFileChanges('src/main.ts');
    expect(mockedInvoke).toHaveBeenCalledWith('discard_file_changes', { filePath: 'src/main.ts' });
  });

  it('propagates errors from invoke', async () => {
    mockedInvoke.mockRejectedValueOnce(new Error('file not found'));
    await expect(discardFileChanges('missing.ts')).rejects.toThrow('file not found');
  });
});

describe('dropStash', () => {
  it('calls invoke with correct params', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined);
    await dropStash(0);
    expect(mockedInvoke).toHaveBeenCalledWith('drop_stash', { index: 0 });
  });

  it('calls invoke with non-zero index', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined);
    await dropStash(3);
    expect(mockedInvoke).toHaveBeenCalledWith('drop_stash', { index: 3 });
  });

  it('propagates errors from invoke', async () => {
    mockedInvoke.mockRejectedValueOnce(new Error('stash not found'));
    await expect(dropStash(99)).rejects.toThrow('stash not found');
  });
});

describe('deleteTag', () => {
  it('calls invoke with correct params', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined);
    await deleteTag('v1.0.0');
    expect(mockedInvoke).toHaveBeenCalledWith('delete_tag', { name: 'v1.0.0' });
  });

  it('propagates errors from invoke', async () => {
    mockedInvoke.mockRejectedValueOnce(new Error('tag not found'));
    await expect(deleteTag('v0.0.0')).rejects.toThrow('tag not found');
  });
});

describe('rebaseAbort', () => {
  it('calls invoke with correct command', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined);
    await rebaseAbort();
    expect(mockedInvoke).toHaveBeenCalledWith('rebase_abort');
  });

  it('propagates errors from invoke', async () => {
    mockedInvoke.mockRejectedValueOnce(new Error('no rebase in progress'));
    await expect(rebaseAbort()).rejects.toThrow('no rebase in progress');
  });
});

describe('revertCommit', () => {
  it('calls invoke with correct params', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined);
    await revertCommit('abc123');
    expect(mockedInvoke).toHaveBeenCalledWith('revert_commit', { commitId: 'abc123' });
  });

  it('propagates errors from invoke', async () => {
    mockedInvoke.mockRejectedValueOnce(new Error('revert conflict'));
    await expect(revertCommit('bad')).rejects.toThrow('revert conflict');
  });
});

describe('cherryPick', () => {
  it('calls invoke with correct params', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined);
    await cherryPick('abc123');
    expect(mockedInvoke).toHaveBeenCalledWith('cherry_pick', { commitId: 'abc123' });
  });

  it('propagates errors from invoke', async () => {
    mockedInvoke.mockRejectedValueOnce(new Error('cherry-pick conflict'));
    await expect(cherryPick('bad')).rejects.toThrow('cherry-pick conflict');
  });
});
