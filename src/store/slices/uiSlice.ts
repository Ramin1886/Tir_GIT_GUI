import { StateCreator } from 'zustand';
import { AppState, UIState } from '../types';
import { settingsStore } from '../settingsStore';

export const applyTheme = (theme: 'system' | 'light' | 'dark') => {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
};

export const createUISlice: StateCreator<AppState, [], [], UIState> = (set) => ({
  currentView: 'WORKING_TREE',
  toasts: [],
  theme: 'system',

  setCurrentView: (view) => set({ currentView: view }),

  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 5000);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  setTheme: async (theme) => {
    applyTheme(theme);
    set({ theme });
    await settingsStore.set('theme', theme);
    await settingsStore.save();
  },
});
