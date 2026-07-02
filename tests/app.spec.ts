import { test, expect } from '@playwright/test';

test.describe('Tir Git GUI', () => {
  // NOTE: Tauri APIs (window.__TAURI__) won't be available in standard browser mode unless mocked.
  // So we mock window.__TAURI__ before page loads to prevent React crashes
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__TAURI__ = {
        core: {
          invoke: async (cmd, args) => {
            if (cmd === 'get_settings') return {};
            if (cmd === 'list_repositories') return [];
            return null;
          }
        },
        event: {
          listen: async () => () => {},
        }
      };
    });
  });

  test('should load the app and show the empty state', async ({ page }) => {
    await page.goto('/');
    
    // Check if the sidebar logo and title are present
    await expect(page.locator('.sidebar-title')).toHaveText('Tir');
    
    // Since there are no repositories opened, it should show the empty state
    await expect(page.locator('.empty-state__title')).toBeVisible();
    await expect(page.locator('.empty-state__title')).toHaveText('No Repository Opened');
  });
});
