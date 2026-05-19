const { test, expect } = require('@playwright/test');
const path = require('path');

test('XSS verification for easy-ai.html', async ({ page }) => {
  const filePath = `file://${path.resolve('easy-ai.html')}`;
  await page.goto(filePath);

  // Payload that would trigger an alert if not escaped
  const payload = '<img src=x onerror="window.xss_triggered=true">';

  await page.evaluate((p) => {
    window.xss_triggered = false;
    updateStatus(p, 'sky');
  }, payload);

  const xssTriggeredStatus = await page.evaluate(() => window.xss_triggered);
  expect(xssTriggeredStatus).toBe(false);

  const statusIndicatorText = await page.textContent('#statusIndicator');
  expect(statusIndicatorText).toContain(payload);

  // Verify displayResults
  await page.evaluate((p) => {
    window.xss_triggered = false;
    // Mock necessary data for displayResults
    window.uniqueItems = new Set(['Item1']);
    window.maxValues = { 'Item1': { bl: 10, cl: 10, fr: 10 } };
    displayResults({ 'Item1_bl': 1, 'Item1_cl': 1, 'Item1_fr': 1 });

    // Manually trigger it with malicious name if possible,
    // but the function iterates over uniqueItems.
    // So let's re-run with malicious item name.
    window.uniqueItems = new Set([p]);
    window.maxValues[p] = { bl: 10, cl: 10, fr: 10 };
    const prediction = {};
    prediction[`${p}_bl`] = 1;
    prediction[`${p}_cl`] = 1;
    prediction[`${p}_fr`] = 1;
    displayResults(prediction);
  }, payload);

  const xssTriggeredResults = await page.evaluate(() => window.xss_triggered);
  expect(xssTriggeredResults).toBe(false);

  const resultsListText = await page.textContent('#predictionsList');
  expect(resultsListText).toContain(payload);
});
