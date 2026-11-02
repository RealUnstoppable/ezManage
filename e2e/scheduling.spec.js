import { test, expect } from '@playwright/test';

test.describe('E2E Shift Scheduling & Operations', () => {
  test('should load index dashboard and interact with shift schedule', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');

    // Switch view to schedule section and load sample shifts
    await page.evaluate(() => {
      document.querySelectorAll('.view-section').forEach((v) => v.classList.remove('active'));
      const scheduleView = document.getElementById('view-schedule');
      if (scheduleView) scheduleView.classList.add('active');

      if (typeof window.seedDummyShiftsForDate === 'function') {
        window.seedDummyShiftsForDate();
      }
    });

    const scheduleList = page.locator('#scheduleList');
    await expect(scheduleList).toBeVisible();

    // Verify at least one employee shift card exists
    const shiftCards = scheduleList.locator('.font-bold');
    await expect(shiftCards.first()).toBeVisible();

    // Verify employee removal button works
    const removeBtns = scheduleList.locator('button.remove-shift-btn');
    const initialCount = await removeBtns.count();
    if (initialCount > 0) {
      await removeBtns.first().click();
      const newCount = await removeBtns.count();
      expect(newCount).toBe(initialCount - 1);
    }
  });
});
