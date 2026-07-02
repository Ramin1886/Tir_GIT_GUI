import { useEffect, useState, useCallback } from 'react';
import { listGitHooks, saveGitHook, deleteGitHook, GitHook } from '../api/git';
import { useAppStore } from '../store';

import styles from "./GitHooksView.module.css";

export function GitHooksView() {
  const [hooks, setHooks] = useState<GitHook[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeHookName, setActiveHookName] = useState<string>('pre-commit');
  const [editorContent, setEditorContent] = useState('');

  const { addToast } = useAppStore();

  const fetchHooks = useCallback(async () => {
    try {
      setLoading(true);
      const list = await listGitHooks();
      setHooks(list);
      
      const current = list.find((h) => h.name === activeHookName);
      if (current) {
        setEditorContent(current.content);
      }
    } catch (err) {
      addToast(`Failed to load Git hooks: ${String(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [activeHookName, addToast]);

  useEffect(() => {
    fetchHooks();
  }, [fetchHooks]);

  const selectHook = (name: string) => {
    setActiveHookName(name);
    const selected = hooks.find((h) => h.name === name);
    if (selected) {
      setEditorContent(selected.content);
    } else {
      setEditorContent('');
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await saveGitHook(activeHookName, editorContent);
      addToast(`Successfully saved Git hook: ${activeHookName}`, 'success');
      await fetchHooks();
    } catch (err) {
      addToast(`Failed to save Git hook: ${String(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to disable/delete the Git hook: ${activeHookName}?`)) {
      return;
    }
    try {
      setLoading(true);
      await deleteGitHook(activeHookName);
      addToast(`Successfully disabled Git hook: ${activeHookName}`, 'success');
      setEditorContent('');
      await fetchHooks();
    } catch (err) {
      addToast(`Failed to disable Git hook: ${String(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const activeHook = hooks.find((h) => h.name === activeHookName);

  if (loading && hooks.length === 0) {
    return (
      <div className={styles.style1}>
        <h2>Git Hooks</h2>
        <p>Loading Git hooks...</p>
      </div>
    );
  }

  return (
    <div className="git-flow-view">
      <div className="settings-view__header">
        <h2 className="settings-view__title">Git Hooks Configuration</h2>
      </div>
      <div className={styles.style3}>
        {/* Hooks Sidebar List */}
        <div className={styles.style4}>
          <h3 className={styles.style5}>Git Hooks</h3>
          {hooks.map((h) => (
            <div
              key={h.name}
              onClick={() => selectHook(h.name)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--spacing-2) var(--spacing-3)',
                borderRadius: 'var(--border-radius)',
                cursor: 'pointer',
                backgroundColor: activeHookName === h.name ? 'var(--color-bg-tertiary)' : 'transparent',
                borderLeft: activeHookName === h.name ? '3px solid var(--color-accent)' : '3px solid transparent',
                paddingLeft: activeHookName === h.name ? 'calc(var(--spacing-3) - 3px)' : 'var(--spacing-3)',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: activeHookName === h.name ? 600 : 500, color: 'var(--color-text-primary)' }}>
                {h.name}
              </span>
              <span style={{
                fontSize: '9px',
                fontWeight: 700,
                padding: '2px 5px',
                borderRadius: '3px',
                backgroundColor: h.exists ? 'rgba(46, 160, 67, 0.15)' : 'rgba(0, 0, 0, 0.05)',
                color: h.exists ? '#2ea043' : 'var(--color-text-secondary)'
              }}>
                {h.exists ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>

        {/* Editor Area */}
        <div className={styles.style6}>
          <div className={styles.style7}>
            <div>
              <h3 className={styles.style8}>
                Editing: {activeHookName}
              </h3>
              <p className={styles.style9}>
                {activeHook?.exists 
                  ? 'This hook is active and executes on corresponding Git actions.' 
                  : 'This hook is inactive. Save a script to enable it.'
                }
              </p>
            </div>
            <div className={styles.style10}>
              <button className="btn btn--primary" onClick={handleSave} disabled={loading}>
                Save Hook
              </button>
              {activeHook?.exists && (
                <button className="btn btn--danger" onClick={handleDelete} disabled={loading}>
                  Disable Hook
                </button>
              )}
            </div>
          </div>

          <div className={styles.style11}>
            <div className={styles.style12}>
              #!/bin/sh (script environment)
            </div>
            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              placeholder="#!/bin/sh&#10;# Write your git hook script here..."
              className={styles.style13}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
