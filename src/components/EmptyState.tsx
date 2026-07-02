
import { open } from '@tauri-apps/plugin-dialog';
import { useAppStore } from '../store';

export function EmptyState() {
  const { addRepositoryTab, recentRepositories } = useAppStore();

  const handleOpenRepo = async () => {
    const selectedPath = await open({
      directory: true,
      title: 'Open Git Repository',
    });
    if (selectedPath) {
      await addRepositoryTab(selectedPath as string);
    }
  };

  const handleCloneRepo = () => {
    // We could either open a prompt for URL or navigate to an "Add Repo" modal
    // For now we can trigger an alert or a modal. 
    // We'll leave it as a placeholder to expand in the next iterations.
    alert("Clone feature coming soon via Command Palette!");
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-[var(--color-text-secondary)]">
      <div className="bg-[var(--color-bg-secondary)] p-12 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] text-center w-full max-w-[500px]">
        <svg className="w-16 h-16 mx-auto mb-6 text-[var(--color-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
        <h2 className="mb-2 text-[var(--color-text-primary)] text-2xl font-bold">Welcome to Tir</h2>
        <p className="mb-8 leading-relaxed">
          It looks like you don't have any repositories open. Open an existing project or clone a new one to get started.
        </p>

        <div className="flex gap-4 justify-center mb-10">
          <button 
            onClick={handleOpenRepo}
            className="px-6 py-3 rounded-md border-none bg-[var(--color-accent)] text-white font-semibold cursor-pointer flex items-center gap-2 transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Open Folder
          </button>

          <button 
            onClick={handleCloneRepo}
            className="px-6 py-3 rounded-md border border-[var(--color-border)] bg-transparent text-[var(--color-text-primary)] font-semibold cursor-pointer flex items-center gap-2 transition-colors hover:bg-[var(--color-bg-tertiary)]"
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Clone Repository
          </button>
        </div>

        {recentRepositories.length > 0 && (
          <div className="text-left">
            <h3 className="text-sm uppercase tracking-wider mb-4 text-[var(--color-text-secondary)] font-semibold">
              Recent Repositories
            </h3>
            <ul className="list-none p-0 m-0 flex flex-col gap-2">
              {recentRepositories.slice(0, 5).map((repoPath) => (
                <li key={repoPath}>
                  <button
                    onClick={() => addRepositoryTab(repoPath)}
                    className="w-full text-left px-4 py-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] cursor-pointer flex items-center gap-3 font-mono hover:bg-[var(--color-bg-tertiary)] transition-colors"
                  >
                    <svg className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                      {repoPath}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
