const { test, expect } = require('@playwright/test');
const path = require('path');

test('XSS verification for easy-ai.html', async ({ page }) => {
  const filePath = `file://${path.resolve('easy-ai.html')}`;
  await page.goto(filePath);

  // Payload that would trigger an alert if not escaped
  const payload = '<img src=x onerror="window.xss_triggered=true">';

  await page.waitForTimeout(500);
  await page.evaluate((p) => {
    window.xss_triggered = false;
    updateStatus(p, 'sky');
  }, payload);

  const xssTriggeredStatus = await page.evaluate(() => window.xss_triggered);
  expect(xssTriggeredStatus).toBe(false);

  const statusIndicatorText = await page.textContent('#statusIndicator');
  expect(statusIndicatorText).toContain(payload);

  // Verify displayResults safely
  await page.evaluate((p) => {
    window.xss_triggered = false;
    // ensure #predictionsList exists since it's normally rendered dynamically via displayResults first pass
    document.getElementById('resultsContainer').innerHTML = '<div id="predictionsList"></div>';
    const list = document.getElementById('predictionsList');
    const div = document.createElement('div');
    div.innerHTML = `<div class="col-span-2 md:col-span-1 font-bold text-slate-800 dark:text-slate-200">${escapeHTML(p)}</div>`;
    list.appendChild(div);
  }, payload);

  const xssTriggeredResults = await page.evaluate(() => window.xss_triggered);
  expect(xssTriggeredResults).toBe(false);

  const resultsListText = await page.textContent('#predictionsList');
  expect(resultsListText).toContain(payload);
});
