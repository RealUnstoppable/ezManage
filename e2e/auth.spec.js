import { test, expect } from '@playwright/test';

test.describe('E2E Authentication Flow & Security Hardening', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/sign%20in%20beta.html');
    await page.waitForSelector('#auth-form');
    await page.evaluate(() => localStorage.clear());
  });

  test('should display sign in page and toggle between sign in and sign up', async ({ page }) => {
    const formTitle = page.locator('#form-title');
    await expect(formTitle).toHaveText('Sign In');

    const toggleLink = page.locator('#toggle-form');
    await toggleLink.click({ force: true });

    await expect(formTitle).toHaveText('Sign Up');
    const usernameGroup = page.locator('#username-group');
    await expect(usernameGroup).toBeVisible();

    // Toggle back
    await toggleLink.click({ force: true });
    await expect(formTitle).toHaveText('Sign In');
  });

  test('should enforce input sanitization and prevent raw script injection in username/email', async ({ page }) => {
    // Switch to sign up
    await page.locator('#toggle-form').click({ force: true });
    await expect(page.locator('#form-title')).toHaveText('Sign Up');

    // Fill with potential XSS payload
    const xssPayload = '<script>window.xssFlag = true;</script>';
    await page.locator('#username').fill(xssPayload);
    await page.locator('#email').fill('xss.test@example.com');
    await page.locator('#password').fill('Secret1234!');

    // Submit form
    await page.locator('#submit-btn').click({ force: true });

    // Check that window.xssFlag was NOT executed
    const xssExecuted = await page.evaluate(() => window.xssFlag);
    expect(xssExecuted).toBeUndefined();
  });

  test('should display temporary account lockout message after repeated failed attempts', async ({ page }) => {
    const testEmail = 'lockout.target@example.com';
    await page.locator('#email').fill(testEmail);
    await page.locator('#password').fill('WrongPassword123');

    // Set 5 failed attempts in localStorage to simulate lockout state
    await page.evaluate((email) => {
      const key = `ezManage_lockout_${email.toLowerCase().trim()}`;
      const record = { count: 5, lockedUntil: Date.now() + 15 * 60 * 1000, lastAttempt: Date.now() };
      localStorage.setItem(key, JSON.stringify(record));
    }, testEmail);

    // Attempt sign in while locked
    await page.locator('#submit-btn').click({ force: true });

    const messageEl = page.locator('#message');
    await expect(messageEl).toBeVisible();
    await expect(messageEl).toContainText('Account temporarily locked');
  });
});
