import { test, expect } from '@playwright/test';

test.describe('E2E Shift Manager Admin Workflows & History Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('should load main application shell and navigate between core views', async ({ page }) => {
    // Check main title
    await expect(page).toHaveTitle(/ezManage/);

    // Navigate to shift tracker view
    await page.evaluate(() => {
      if (typeof window.navTo === 'function') {
        window.navTo('tracker');
      }
    });

    const trackerView = page.locator('#view-tracker');
    await expect(trackerView).toHaveClass(/active/);

    // Navigate to shift history view
    await page.evaluate(() => {
      if (typeof window.navTo === 'function') {
        window.navTo('history');
      }
    });

    const historyView = page.locator('#view-history');
    await expect(historyView).toHaveClass(/active/);
  });

  test('should support shift routine checks and form entries in shift tracker', async ({ page }) => {
    await page.evaluate(() => {
      if (typeof window.navTo === 'function') {
        window.navTo('tracker');
      }
    });

    // Check routine checklist checkboxes
    const routineChecks = page.locator('#routineContainer input[type="checkbox"]');
    const checkCount = await routineChecks.count();
    if (checkCount > 0) {
      await routineChecks.first().check();
      await expect(routineChecks.first()).toBeChecked();
    }

    // Fill notes in prepNotes
    const prepNotes = page.locator('#prepNotes');
    if (await prepNotes.isVisible()) {
      await prepNotes.fill('Midday shift completed smoothly. Prepped extra stock for dinner rush.');
      await expect(prepNotes).toHaveValue('Midday shift completed smoothly. Prepped extra stock for dinner rush.');
    }
  });

  test('should render shift history logs with unique ID tracking and prevent duplicate rendering', async ({ page }) => {
    // Switch to history view and simulate shift logs with unique IDs
    await page.evaluate(() => {
      window.currentUser = { uid: 'test_admin_manager_01', email: 'admin@ezmanage.com' };
      window.currentUserData = {
        name: 'Shift Admin',
        role: 'StoreManager',
        cloudSyncEnabled: true,
        shiftHistory: [
          {
            id: 'shift_log_101',
            dateSaved: '2026-11-02',
            timeSaved: '08:00 AM',
            manager: 'Alex Morgan',
            durationMins: 480,
            prepNotes: 'Morning opening routine complete.',
          },
          {
            id: 'shift_log_102',
            dateSaved: '2026-11-02',
            timeSaved: '04:00 PM',
            manager: 'Jordan Smith',
            durationMins: 450,
            prepNotes: 'Evening closing routine complete.',
          },
        ],
      };
      window.cloudSyncEnabled = true;

      if (typeof window.navTo === 'function') {
        window.navTo('history');
      }

      if (typeof window.renderHistory === 'function') {
        window.renderHistory();
      }
    });

    const container = page.locator('#historyListContainer');
    await expect(container).toBeVisible();

    // Verify exactly one item for shift_log_101 and shift_log_102
    const item101 = container.locator('#history-item-shift_log_101');
    const item102 = container.locator('#history-item-shift_log_102');

    await expect(item101).toBeAttached();
    await expect(item102).toBeAttached();

    // Re-trigger renderHistory to verify strict de-duplication
    await page.evaluate(() => {
      if (typeof window.renderHistory === 'function') {
        window.renderHistory();
      }
    });

    // Count should still be exactly 1 per ID
    await expect(container.locator('#history-item-shift_log_101')).toHaveCount(1);
    await expect(container.locator('#history-item-shift_log_102')).toHaveCount(1);
  });

  test('should filter shift history logs by search input', async ({ page }) => {
    await page.evaluate(() => {
      window.currentUser = { uid: 'test_admin_manager_01', email: 'admin@ezmanage.com' };
      window.currentUserData = {
        cloudSyncEnabled: true,
        shiftHistory: [
          {
            id: 'shift_alex',
            dateSaved: '2026-11-01',
            timeSaved: '10:00 AM',
            manager: 'Alex Morgan',
            durationMins: 360,
            prepNotes: 'Morning open',
          },
          {
            id: 'shift_jordan',
            dateSaved: '2026-11-01',
            timeSaved: '06:00 PM',
            manager: 'Jordan Smith',
            durationMins: 300,
            prepNotes: 'Evening close',
          },
        ],
      };
      window.cloudSyncEnabled = true;

      if (typeof window.navTo === 'function') {
        window.navTo('history');
      }

      const searchInput = document.getElementById('historySearch');
      if (searchInput) searchInput.value = 'jordan';

      if (typeof window.renderHistory === 'function') {
        window.renderHistory();
      }
    });

    const container = page.locator('#historyListContainer');
    await expect(container.locator('#history-item-shift_jordan')).toHaveCount(1);
    await expect(container.locator('#history-item-shift_alex')).toHaveCount(0);
  });

  test('should navigate to announcements and notices view', async ({ page }) => {
    await page.evaluate(() => {
      if (typeof window.navTo === 'function') {
        window.navTo('announcements');
      }
    });

    const announcementsView = page.locator('#view-announcements');
    await expect(announcementsView).toHaveClass(/active/);
  });
});
