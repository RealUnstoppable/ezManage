import { test, expect } from '@playwright/test';

test.describe('E2E Phase 5: Recognition Podium, Performance Graph & Feature Requests', () => {

  test.describe('Duolingo-Style Team Recognition Leaderboard & Anonymous Voting', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:3000/index.html#recognition');
      await page.evaluate(() => {
        localStorage.clear();
        const employees = [
          { id: 'emp_1', name: 'Maria Santos', role: 'Shift Lead' },
          { id: 'emp_2', name: 'David Kim', role: 'Line Cook' },
          { id: 'emp_3', name: 'Chloe Taylor', role: 'Cashier' },
          { id: 'emp_4', name: 'James Wilson', role: 'Prep Cook' }
        ];
        const orgId = 'demo-org';
        localStorage.setItem(`ezManage_employees_${orgId}`, JSON.stringify(employees));
        // Give Maria initial votes
        localStorage.setItem(`ezManage_employee_votes_${orgId}`, JSON.stringify({
          'emp_1': 10,
          'emp_2': 6,
          'emp_3': 3,
          'emp_4': 1
        }));
      });
      await page.reload();
      // Ensure view-recognition is active
      await page.evaluate(() => {
        if (window.navTo) window.navTo('recognition');
      });
    });

    test('should render 3-step podium with Gold (1st), Silver (2nd), and Bronze (3rd)', async ({ page }) => {
      const podium = page.locator('#recognitionPodiumContainer');
      await expect(podium).toBeVisible();

      // Verify place badges
      await expect(podium).toContainText('👑 1ST PLACE');
      await expect(podium).toContainText('🥈 2ND');
      await expect(podium).toContainText('🥉 3RD');

      // Verify top 3 employees are on the podium
      await expect(podium).toContainText('Maria Santos');
      await expect(podium).toContainText('David Kim');
      await expect(podium).toContainText('Chloe Taylor');

      // Remaining employee is in the leaderboard list below
      const leaderboard = page.locator('#recognitionLeaderboardContainer');
      await expect(leaderboard).toContainText('James Wilson');
      await expect(leaderboard).toContainText('#4');
    });

    test('should support anonymous upvoting and downvoting with spam prevention', async ({ page }) => {
      const podium = page.locator('#recognitionPodiumContainer');
      await expect(podium).toBeVisible();

      // Maria's initial score is +10
      const mariaScore = page.locator('#vote-score-emp_1').first();
      await expect(mariaScore).toContainText('+10');

      // Click upvote on Maria
      const mariaUpvoteBtn = page.locator('button[data-action="vote"][data-id="emp_1"][data-dir="1"]').first();
      await mariaUpvoteBtn.click();

      // Score should increase to +11
      await expect(mariaScore).toContainText('+11');

      // Clicking upvote again cancels the vote (anti-spam toggle)
      await mariaUpvoteBtn.click();
      await expect(mariaScore).toContainText('+10');

      // Click downvote on Maria
      const mariaDownvoteBtn = page.locator('button[data-action="vote"][data-id="emp_1"][data-dir="-1"]').first();
      await mariaDownvoteBtn.click();
      await expect(mariaScore).toContainText('+9');
    });
  });

  test.describe('Manager Performance Graph', () => {
    test('should render performance chart when navigating to Manager Performance view', async ({ page }) => {
      await page.goto('http://localhost:3000/index.html#welcome');
      await page.evaluate(() => {
        // Setup mock shift history
        const shifts = [
          { dateSaved: '2026-10-28', durationMins: 45, inventory: [{}, {}], routines: [{ checked: true }] },
          { dateSaved: '2026-10-29', durationMins: 40, inventory: [{}, {}, {}], routines: [{ checked: true }] }
        ];
        localStorage.setItem('ezManage_last_completed_shift_guest', JSON.stringify(shifts[0]));
      });

      // Navigate to performance view
      await page.evaluate(() => {
        if (window.navTo) window.navTo('performance');
      });

      const perfView = page.locator('#view-performance');
      await expect(perfView).toBeVisible();

      const chartCanvas = page.locator('#performanceChart');
      await expect(chartCanvas).toBeVisible();

      // Canvas should have non-zero dimensions
      const box = await chartCanvas.boundingBox();
      expect(box).not.toBeNull();
      expect(box.width).toBeGreaterThan(100);
      expect(box.height).toBeGreaterThan(50);
    });
  });

  test.describe('Feature Requests Deletion & Completed Archive', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:3000/index.html#request');
    });

    test('should allow deleting a feature request and archiving completed requests', async ({ page }) => {
      // Mock feature requests in DOM via cached render
      await page.evaluate(() => {
        const mockRequests = [
          { id: 'req_1', message: 'Add export to CSV for temperature logs', status: 'In Progress', timestamp: new Date().toISOString() },
          { id: 'req_2', message: 'Dark mode theme toggle support', status: 'Completed', timestamp: new Date().toISOString() }
        ];
        if (window.renderFeatureRequestsView) {
          window.renderFeatureRequestsView(mockRequests);
        }
      });

      const activeList = page.locator('#myFeatureRequests');
      await expect(activeList).toContainText('Add export to CSV');
      await expect(activeList).toContainText('Dark mode theme toggle support');

      // Completed request has a Hide button
      const hideBtn = page.locator('.hide-feature-req-btn[data-id="req_2"]');
      await expect(hideBtn).toBeVisible();

      // Click Hide on completed request
      await hideBtn.click();

      // req_2 should disappear from active requests
      await expect(activeList).not.toContainText('Dark mode theme toggle support');

      // Collapsible archive section should appear
      const archiveSection = page.locator('#archivedFeatureRequestsSection');
      await expect(archiveSection).toBeVisible();
      await expect(page.locator('#archivedRequestsCount')).toContainText('1');

      // Toggle archive section open
      await page.locator('#btnToggleArchivedRequests').click();
      const archiveContainer = page.locator('#archivedFeatureRequestsContainer');
      await expect(archiveContainer).toBeVisible();
      await expect(archiveContainer).toContainText('Dark mode theme toggle support');

      // Restore button moves it back
      const restoreBtn = archiveContainer.locator('.restore-feature-req-btn[data-id="req_2"]');
      await restoreBtn.click();

      // Should be back in active list
      await expect(activeList).toContainText('Dark mode theme toggle support');
    });
  });

});
