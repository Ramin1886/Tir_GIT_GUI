import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store';
import { fetchRemote, pullRemote, pushRemote, listBranches } from '../api/git';

interface CommandItem {
  id: string;
  category: string;
  name: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  onClose: () => void;
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    setCurrentView,
    theme,
    setTheme,
    openRepositories,
    selectRepositoryTab,
    addToast
  } = useAppStore();

  const [branches, setBranches] = useState<string[]>([]);

  useEffect(() => {
    // Load local branches for fast switching
    listBranches()
      .then((list) => {
        setBranches(list.filter(b => !b.is_remote).map(b => b.shorthand));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    inputRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Define commands
  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-working-tree',
      category: 'Navigation',
      name: 'Go to Working Tree',
      shortcut: 'G W',
      action: () => setCurrentView('WORKING_TREE')
    },
    {
      id: 'nav-history',
      category: 'Navigation',
      name: 'Go to Commit History',
      shortcut: 'G H',
      action: () => setCurrentView('HISTORY')
    },
    {
      id: 'nav-branches',
      category: 'Navigation',
      name: 'Go to Branches',
      shortcut: 'G B',
      action: () => setCurrentView('BRANCHES')
    },
    {
      id: 'nav-stashes',
      category: 'Navigation',
      name: 'Go to Stashes',
      shortcut: 'G S',
      action: () => setCurrentView('STASHES')
    },
    {
      id: 'nav-tags',
      category: 'Navigation',
      name: 'Go to Tags',
      shortcut: 'G T',
      action: () => setCurrentView('TAGS')
    },
    {
      id: 'nav-remotes',
      category: 'Navigation',
      name: 'Go to Remotes',
      shortcut: 'G R',
      action: () => setCurrentView('REMOTES')
    },
    {
      id: 'nav-submodules',
      category: 'Navigation',
      name: 'Go to Submodules',
      shortcut: 'G M',
      action: () => setCurrentView('SUBMODULES')
    },
    {
      id: 'nav-settings',
      category: 'Navigation',
      name: 'Go to Settings',
      shortcut: 'G ,',
      action: () => setCurrentView('SETTINGS')
    },

    // Git Operations
    {
      id: 'git-fetch',
      category: 'Git',
      name: 'Fetch from all remotes',
      action: async () => {
        addToast('Fetching remotes...', 'info');
        try {
          await fetchRemote('origin');
          addToast('Fetch completed successfully', 'success');
        } catch (err) {
          addToast(`Fetch failed: ${String(err)}`, 'error');
        }
      }
    },
    {
      id: 'git-pull',
      category: 'Git',
      name: 'Pull from upstream branch',
      action: async () => {
        addToast('Pulling changes...', 'info');
        try {
          await pullRemote('origin', 'main');
          addToast('Pull completed successfully', 'success');
        } catch (err) {
          // Retry with current active branch if origin main isn't tracked or doesn't exist
          try {
            await pullRemote('origin', 'master');
            addToast('Pull master completed', 'success');
          } catch {
            addToast(`Pull failed: ${String(err)}`, 'error');
          }
        }
      }
    },
    {
      id: 'git-push',
      category: 'Git',
      name: 'Push to upstream tracking branch',
      action: async () => {
        addToast('Pushing changes...', 'info');
        try {
          await pushRemote('origin', 'main', false);
          addToast('Push completed successfully', 'success');
        } catch (err) {
          addToast(`Push failed: ${String(err)}`, 'error');
        }
      }
    },

    // Settings & Theme
    {
      id: 'theme-toggle',
      category: 'Settings',
      name: `Switch Theme (Current: ${theme})`,
      action: () => {
        const nextTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
        setTheme(nextTheme);
        addToast(`Theme set to ${nextTheme}`, 'info');
      }
    }
  ];

  // Dynamically add repository switcher commands
  openRepositories.forEach((repo, idx) => {
    const name = repo.split('/').pop() || repo;
    commands.push({
      id: `repo-switch-${idx}`,
      category: 'Workspaces',
      name: `Switch to Repository: ${name}`,
      shortcut: `Tab ${idx + 1}`,
      action: () => {
        selectRepositoryTab(idx);
        addToast(`Switched repository to: ${name}`, 'success');
      }
    });
  });

  // Dynamically add branch checkout commands
  branches.forEach((branch) => {
    commands.push({
      id: `branch-checkout-${branch}`,
      category: 'Branches',
      name: `Checkout Branch: ${branch}`,
      action: async () => {
        try {
          // Import dynamic command checkout
          const { checkoutBranch } = await import('../api/git');
          await checkoutBranch(branch);
          addToast(`Switched to branch ${branch}`, 'success');
        } catch (err) {
          addToast(`Failed to switch to branch ${branch}: ${String(err)}`, 'error');
        }
      }
    });
  });

  // Filter commands
  const filteredCommands = commands.filter((cmd) => {
    const term = search.toLowerCase();
    return (
      cmd.name.toLowerCase().includes(term) ||
      cmd.category.toLowerCase().includes(term)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      // Scroll selected item into view
      setTimeout(() => {
        const activeItem = listRef.current?.querySelector('.command-palette__item--selected');
        activeItem?.scrollIntoView({ block: 'nearest' });
      }, 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      setTimeout(() => {
        const activeItem = listRef.current?.querySelector('.command-palette__item--selected');
        activeItem?.scrollIntoView({ block: 'nearest' });
      }, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
      }
    }
  };

  return (
    <div className="command-palette-backdrop" onClick={onClose}>
      <div
        className="command-palette-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="command-palette__search-box">
          <svg className="command-palette__search-icon" viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="command-palette__input"
            placeholder="Type a command or search files..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <span className="command-palette__esc-hint">ESC</span>
        </div>

        <div className="command-palette__list" ref={listRef}>
          {filteredCommands.length === 0 ? (
            <div className="command-palette__empty">No commands found.</div>
          ) : (
            (() => {
              let currentCategory = '';
              return filteredCommands.map((cmd, index) => {
                const isSelected = index === selectedIndex;
                const showHeader = cmd.category !== currentCategory;
                if (showHeader) {
                  currentCategory = cmd.category;
                }
                return (
                  <div key={cmd.id}>
                    {showHeader && (
                      <div className="command-palette__category-header">
                        {cmd.category}
                      </div>
                    )}
                    <div
                      className={`command-palette__item ${
                        isSelected ? 'command-palette__item--selected' : ''
                      }`}
                      onClick={() => {
                        cmd.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <span className="command-palette__item-name">{cmd.name}</span>
                      {cmd.shortcut && (
                        <kbd className="command-palette__shortcut">{cmd.shortcut}</kbd>
                      )}
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>
      </div>
    </div>
  );
}
