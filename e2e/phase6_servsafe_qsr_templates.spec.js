import { test, expect } from '@playwright/test';

test.describe('E2E Phase 6: ServSafe Checklists, Sidebar Hub & Multi-Chain QSR Templates', () => {

  test('should load expanded Arby\'s ServSafe checklist on Active Tracker by default', async ({ page }) => {
    // Navigate to tracker
    await page.goto('http://localhost:3000/index.html#tracker');
    await page.evaluate(() => {
      localStorage.clear();
      if (window.navTo) window.navTo('tracker');
    });

    const routineContainer = page.locator('#routineContainer');
    await expect(routineContainer).toBeVisible();

    // Verify critical ServSafe & QSR checkpoints
    await expect(routineContainer).toContainText('Walk-In Cooler/Freezer Temps');
    await expect(routineContainer).toContainText('Hot Holding Line Temps');
    await expect(routineContainer).toContainText('Roast Beef Slicer Sanitization (4-Hour Cycle)');
    await expect(routineContainer).toContainText('Quat/Chlorine Sanitizer Bucket PPM Test');
    await expect(routineContainer).toContainText('FIFO Date Marking & 7-Day Discard Audit');
    await expect(routineContainer).toContainText('Handwashing Sink Soap/Towel Stock & 100°F Water');
    await expect(routineContainer).toContainText('Raw vs. Ready-to-Eat Cross-Contamination Check');
    await expect(routineContainer).toContainText('Ice Machine Chute & Scoop Sanitization');
    await expect(routineContainer).toContainText('Hood Vent / Ansul System Visual Check');
  });

  test('should open ServSafe & Inspection Tips Hub modal from sidebar and display critical standards', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html#welcome');

    // Open sidebar
    const toggleMenuBtn = page.locator('button[aria-label="Toggle Menu"]').first();
    await toggleMenuBtn.click();

    const openHubBtn = page.locator('#btnOpenServSafeHub');
    await expect(openHubBtn).toBeVisible();
    await openHubBtn.click();

    // ServSafe Hub Modal should be visible
    const modal = page.locator('#servSafeModal');
    await expect(modal).toBeVisible();

    // Verify Danger Zone
    await expect(modal).toContainText('Time / Temp Danger Zone (41°F – 135°F)');
    await expect(modal).toContainText('4 hours total');

    // Verify Two-Stage Cooling Rules
    await expect(modal).toContainText('Two-Stage Cooling Protocol');
    await expect(modal).toContainText('135°F down to 70°F within 2 hours');
    await expect(modal).toContainText('70°F down to 41°F or lower within an additional 4 hours');

    // Verify Sanitizer PPMs
    await expect(modal).toContainText('Quaternary Ammonium (Quat)');
    await expect(modal).toContainText('200 – 400 PPM');
    await expect(modal).toContainText('Chlorine / Bleach Solution');
    await expect(modal).toContainText('50 – 100 PPM');

    // Verify Verified External Links
    const servSafeLink = modal.locator('a[href="https://www.servsafe.com/"]');
    await expect(servSafeLink).toBeVisible();
    await expect(servSafeLink).toHaveAttribute('target', '_blank');

    const fdaLink = modal.locator('a[href*="fda-food-code"]');
    await expect(fdaLink).toBeVisible();

    // Close modal
    const closeBtn = modal.locator('button[aria-label="Close food safety hub"]');
    await closeBtn.click();
    await expect(modal).toBeHidden();
  });

  test('should display multi-chain templates with search and sort in Templates view', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html#presets');

    // Ensure templates view is rendered
    await page.evaluate(() => {
      if (window.navTo) window.navTo('presets');
    });

    const grid = page.locator('#qsrTemplatesGrid');
    await expect(grid).toBeVisible();

    // Verify key major chains exist
    await expect(grid).toContainText("Arby's");
    await expect(grid).toContainText("Chick-fil-A");
    await expect(grid).toContainText("McDonald's");
    await expect(grid).toContainText("Papa Johns");
    await expect(grid).toContainText("Chipotle");
    await expect(grid).toContainText("Wendy's");
    await expect(grid).toContainText("Starbucks");

    // Search bar functionality
    const searchInput = page.locator('#templateSearchInput');
    await searchInput.fill('Papa Johns');

    // Grid should show only Papa Johns
    await expect(grid).toContainText('Papa Johns');
    await expect(grid).not.toContainText('McDonald\'s');

    // Search by routine keyword (e.g., Slicer)
    await searchInput.fill('Slicer');
    await expect(grid).toContainText("Arby's");
    await expect(grid).toContainText("Subway");
    await expect(grid).not.toContainText("Starbucks");

    // Clear search
    await searchInput.fill('');
    await expect(page.locator('#templateResultsCount')).toContainText('14 Chains');

    // Sort Alphabetical (A-Z)
    const sortSelect = page.locator('#templateSortSelect');
    await sortSelect.selectOption('alpha');

    // First card should be Arby's, followed by Burger King, Chick-fil-A
    const firstCard = grid.locator('[data-template-id]').first();
    await expect(firstCard).toContainText("Arby's");

    const secondCard = grid.locator('[data-template-id]').nth(1);
    await expect(secondCard).toContainText("Burger King");
  });

  test('should preview and apply a major chain template to the Active Tracker', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html#presets');
    await page.evaluate(() => {
      if (window.navTo) window.navTo('presets');
    });

    // Preview Chick-fil-A template
    const cfaCard = page.locator('[data-template-id="chickfila"]');
    await expect(cfaCard).toBeVisible();

    const previewBtn = cfaCard.locator('button:has-text("Preview")');
    await previewBtn.click();

    const previewModal = page.locator('#templatePreviewModal');
    await expect(previewModal).toBeVisible();
    await expect(previewModal).toContainText('Chick-fil-A');
    await expect(previewModal).toContainText('Pressure Fryer Filtration');
    await expect(previewModal).toContainText('Kanban Warming Chute');
    await expect(previewModal).toContainText('Waffle Potato Fries');

    // Accept confirm dialog when applying template
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    const applyBtn = previewModal.locator('#btnApplyPreviewTemplate');
    await applyBtn.click();

    // Should navigate to Active Tracker
    const trackerView = page.locator('#view-tracker');
    await expect(trackerView).toBeVisible();

    // Verify Chick-fil-A authentic inventory & routines are loaded
    const firstInvInput = page.locator('#inventoryContainer .inv-name').first();
    await expect(firstInvInput).toHaveValue(/CFA Filets/);

    const routineContainer = page.locator('#routineContainer');
    await expect(routineContainer).toContainText('Pressure Fryer Filtration');
    await expect(routineContainer).toContainText('Kanban Warming Chute');
    await expect(routineContainer).toContainText('Dining Room \'Core 4\'');
  });

});
