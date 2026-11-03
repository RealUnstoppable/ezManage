import { test, expect } from '@playwright/test';

test.describe('E2E Inventory Counting & Management', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before test to guarantee clean slate
    await page.goto('http://localhost:3000/inventory.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should load inventory page and display initial elements', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Inventory Management');
    const addItemBtn = page.locator('#addItemBtn');
    await expect(addItemBtn).toBeVisible();

    const tableBody = page.locator('#inventoryTableBody');
    await expect(tableBody).toBeAttached();
  });

  test('should open add item modal, create an item, and render it with unique tracking', async ({ page }) => {
    // Open modal
    await page.locator('#addItemBtn').click();
    const itemModal = page.locator('#itemModal');
    await expect(itemModal).toBeVisible();

    // Fill form
    await page.locator('#itemName').fill('Organic Whole Milk');
    await page.locator('#itemQuantity').fill('24');
    await page.locator('#itemThreshold').fill('5');

    // Submit form
    await page.locator('#itemForm button[type="submit"]').click();

    // Verify modal closes
    await expect(itemModal).toBeHidden();

    // Verify row rendered in table
    const tableBody = page.locator('#inventoryTableBody');
    const row = tableBody.locator('tr').filter({ hasText: 'Organic Whole Milk' });
    await expect(row).toBeVisible();
    await expect(row).toContainText('24');
    await expect(row).toContainText('5');

    // Verify strict unique tracking attribute
    const rowId = await row.getAttribute('id');
    expect(rowId).toMatch(/^item-row-/);
  });

  test('should display low stock visual alert when quantity is below threshold', async ({ page }) => {
    // Open modal
    await page.locator('#addItemBtn').click();
    await page.locator('#itemName').fill('Sanitizer Wipes');
    await page.locator('#itemQuantity').fill('2');
    await page.locator('#itemThreshold').fill('10');
    await page.locator('#itemForm button[type="submit"]').click();

    const lowStockRow = page.locator('#inventoryTableBody tr').filter({ hasText: 'Sanitizer Wipes' });
    await expect(lowStockRow).toBeVisible();

    // Low stock rows should have the warning class
    const className = await lowStockRow.getAttribute('class');
    expect(className).toContain('bg-rose-900/10');
  });

  test('should prevent duplicate rendering / double-painting when adding items', async ({ page }) => {
    // Add item 1
    await page.locator('#addItemBtn').click();
    await page.locator('#itemName').fill('Napkins Box');
    await page.locator('#itemQuantity').fill('50');
    await page.locator('#itemThreshold').fill('10');
    await page.locator('#itemForm button[type="submit"]').click();

    // Add item 2
    await page.locator('#addItemBtn').click();
    await page.locator('#itemName').fill('Espresso Beans');
    await page.locator('#itemQuantity').fill('15');
    await page.locator('#itemThreshold').fill('3');
    await page.locator('#itemForm button[type="submit"]').click();

    // Verify exactly one row exists for each item
    const napkinsRows = page.locator('#inventoryTableBody tr').filter({ hasText: 'Napkins Box' });
    await expect(napkinsRows).toHaveCount(1);

    const espressoRows = page.locator('#inventoryTableBody tr').filter({ hasText: 'Espresso Beans' });
    await expect(espressoRows).toHaveCount(1);
  });

  test('should edit an existing inventory item in-place without duplicating', async ({ page }) => {
    // Create initial item
    await page.locator('#addItemBtn').click();
    await page.locator('#itemName').fill('Paper Cups');
    await page.locator('#itemQuantity').fill('100');
    await page.locator('#itemThreshold').fill('20');
    await page.locator('#itemForm button[type="submit"]').click();

    const row = page.locator('#inventoryTableBody tr').filter({ hasText: 'Paper Cups' });
    await expect(row).toBeVisible();

    // Click edit button on the row
    await row.locator('button[data-action="edit"]').click();

    const itemModal = page.locator('#itemModal');
    await expect(itemModal).toBeVisible();
    await expect(page.locator('#itemName')).toHaveValue('Paper Cups');

    // Update quantity
    await page.locator('#itemQuantity').fill('150');
    await page.locator('#itemForm button[type="submit"]').click();

    await expect(itemModal).toBeHidden();

    // Verify still exactly one row with updated quantity
    const updatedRows = page.locator('#inventoryTableBody tr').filter({ hasText: 'Paper Cups' });
    await expect(updatedRows).toHaveCount(1);
    await expect(updatedRows.first()).toContainText('150');
  });

  test('should delete an inventory item and remove it from the table', async ({ page }) => {
    // Add item to delete
    await page.locator('#addItemBtn').click();
    await page.locator('#itemName').fill('Temp Item');
    await page.locator('#itemQuantity').fill('10');
    await page.locator('#itemThreshold').fill('2');
    await page.locator('#itemForm button[type="submit"]').click();

    const row = page.locator('#inventoryTableBody tr').filter({ hasText: 'Temp Item' });
    await expect(row).toBeVisible();

    // Accept confirm dialog automatically
    page.on('dialog', dialog => dialog.accept());

    // Click delete
    await row.locator('button[data-action="delete"]').click();

    // Verify row is gone
    await expect(page.locator('#inventoryTableBody tr').filter({ hasText: 'Temp Item' })).toHaveCount(0);
  });
});
