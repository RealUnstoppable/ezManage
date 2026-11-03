import { test, expect } from '@playwright/test';

test.describe('E2E Unified Inventory & AI Prediction Engine (Phase 4)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/inventory.html');
    await page.evaluate(() => {
      localStorage.clear();
      // Setup demo items
      const items = [
        { id: 'item_1', itemName: 'Whole Milk Organic', quantity: 24, threshold: 5, addedVia: 'other' },
        { id: 'item_2', itemName: 'Espresso Roast Beans', quantity: 18, threshold: 4, addedVia: 'manual' },
        { id: 'item_3', itemName: 'Oat Milk Barista', quantity: 12, threshold: 3, addedVia: 'automated' }
      ];
      localStorage.setItem('ezManage_inventory_default', JSON.stringify(items));
      localStorage.setItem('ezManage_inventory_demo-org', JSON.stringify(items));
    });
    await page.reload();
  });

  test('should render Search Bar, Sort Controls, and AI Metrics Table Header', async ({ page }) => {
    await expect(page.locator('#inventorySearchInput')).toBeVisible();
    await expect(page.locator('#inventorySortSelect')).toBeVisible();
    await expect(page.locator('#statTotalItems')).toBeVisible();
    await expect(page.locator('#statAIStatus')).toContainText('AI Enabled');
    await expect(page.locator('#inventoryTableBody tr')).toHaveCount(3);
  });

  test('should filter inventory in real-time using search bar', async ({ page }) => {
    const searchInput = page.locator('#inventorySearchInput');
    await searchInput.fill('Espresso');

    const visibleRows = page.locator('#inventoryTableBody tr');
    await expect(visibleRows).toHaveCount(1);
    await expect(visibleRows.first()).toContainText('Espresso Roast Beans');

    // Clear search
    await page.locator('#clearSearchBtn').click();
    await expect(page.locator('#inventoryTableBody tr')).toHaveCount(3);
  });

  test('should enforce tiered AI access when AI is disabled (shows only manual/other items)', async ({ page }) => {
    // Disable AI in localStorage
    await page.evaluate(() => {
      localStorage.setItem('ezManage_aiEnabled_demo-org', 'false');
      localStorage.setItem('ezManage_lastUid', 'demo-org');
    });
    await page.reload();

    // Verify AI Disabled banner appears
    const banner = page.locator('#aiDisabledBanner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('AI Predictor Disabled');

    // In AI Disabled mode, only items with addedVia == 'other' or 'manual' should be visible (2 out of 3)
    const visibleRows = page.locator('#inventoryTableBody tr');
    await expect(visibleRows).toHaveCount(2);
    await expect(visibleRows.filter({ hasText: 'Whole Milk Organic' })).toBeVisible();
    await expect(visibleRows.filter({ hasText: 'Espresso Roast Beans' })).toBeVisible();
    await expect(visibleRows.filter({ hasText: 'Oat Milk Barista' })).toHaveCount(0);

    // One-click enable AI from inventory banner
    await page.locator('#btnEnableAIFromInventory').click();
    await expect(banner).toBeHidden();
    await expect(page.locator('#inventoryTableBody tr')).toHaveCount(3);
  });

  test('should manage multi-select items and display sticky import button', async ({ page }) => {
    const importBtn = page.locator('#btnImportSelected');
    await expect(importBtn).toBeHidden();

    // Select first item
    const firstCheckbox = page.locator('#inventoryTableBody tr input.item-select-checkbox').first();
    await firstCheckbox.check();

    // Verify sticky button appears with count (1)
    await expect(importBtn).toBeVisible();
    await expect(importBtn).toContainText('Import Selected to Shift Tracker (1)');

    // Select second item
    const secondCheckbox = page.locator('#inventoryTableBody tr input.item-select-checkbox').nth(1);
    await secondCheckbox.check();
    await expect(importBtn).toContainText('Import Selected to Shift Tracker (2)');

    // Click Import Selected to Shift Tracker
    await importBtn.click();
    await page.waitForURL(/index\.html#tracker/);

    // Verify item was ingested into the Shift Tracker in index.html
    const trackerInventory = page.locator('#inventoryContainer .inventory-item');
    await expect(trackerInventory.first()).toBeVisible();
  });

  test('should display ⚠️ RECALL / ISSUE FLAGGED badge on affected items from announcements', async ({ page }) => {
    // Inject announcement with recall keywords mentioning Whole Milk
    await page.evaluate(() => {
      const announcements = [
        {
          title: 'Urgent Supplier Recall',
          content: 'Do not serve Whole Milk Organic due to quality issue and contamination warning.'
        }
      ];
      localStorage.setItem('ezManage_announcements', JSON.stringify(announcements));
    });
    await page.reload();

    // Verify Whole Milk row displays the recall badge
    const milkRow = page.locator('#inventoryTableBody tr').filter({ hasText: 'Whole Milk Organic' });
    await expect(milkRow).toBeVisible();
    const recallBadge = milkRow.locator('.recall-flag-badge');
    await expect(recallBadge).toBeVisible();
    await expect(recallBadge).toContainText('RECALL / ISSUE FLAGGED');
  });

  test('should support "+ Add Item" dropdown on Shift Tracker in index.html', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html#tracker');

    const dropdownBtn = page.locator('#btnAddItemTrackerDropdown');
    await expect(dropdownBtn).toBeVisible();

    // Open dropdown
    await dropdownBtn.click();
    const selectFromInvLink = page.locator('a:has-text("Select from Inventory")');
    const manualInputBtn = page.locator('button:has-text("Other (Manual Input)")');

    await expect(selectFromInvLink).toBeVisible();
    await expect(manualInputBtn).toBeVisible();

    // Click Other (Manual Input)
    await manualInputBtn.click();

    // Verify new manual input row is inserted into #inventoryContainer
    const newRow = page.locator('#inventoryContainer .inventory-item').first();
    await expect(newRow).toBeVisible();
    const nameInput = newRow.locator('.inv-name');
    await expect(nameInput).toBeFocused();
  });
});
