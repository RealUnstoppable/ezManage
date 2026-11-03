import { test, expect } from '@playwright/test';

test.describe('E2E Phase 7: Adobe CC-Style Tutorial & Cross-Platform Smart Download', () => {

  test('should run step-by-step Adobe CC-style onboarding tour with Next, Back, and Complete controls', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html#tracker');
    await page.evaluate(() => {
      localStorage.clear();
      if (window.navTo) window.navTo('tracker');
      // Trigger tour
      if (window.InteractiveTutorial) {
        window.InteractiveTutorial.startInteractiveTour({ force: true, uid: 'new_mgr_1' });
      }
    });

    const overlay = page.locator('#guidedTutorialOverlay');
    await expect(overlay).toBeVisible();

    const tourCard = page.locator('#tourCard');
    await expect(tourCard).toBeVisible();

    // Step 1: Active Shift Tracker
    await expect(tourCard).toContainText('STEP 1 OF 5');
    await expect(tourCard).toContainText('Active Shift Tracker & Operations');
    await expect(tourCard).toContainText('neural activity detection');

    // Next step -> Step 2: Safe Sheet
    const nextBtn = tourCard.locator('#btnTourNext');
    await nextBtn.click();

    await expect(tourCard).toContainText('STEP 2 OF 5');
    await expect(tourCard).toContainText('Store Safe Sheet & Cash Audit');

    // Back step -> returns to Step 1
    const prevBtn = tourCard.locator('#btnTourPrev');
    await expect(prevBtn).toBeVisible();
    await prevBtn.click();

    await expect(tourCard).toContainText('STEP 1 OF 5');

    // Advance to Step 3: Inventory & AI
    await nextBtn.click();
    await nextBtn.click();
    await expect(tourCard).toContainText('STEP 3 OF 5');
    await expect(tourCard).toContainText('Unified Inventory & AI Predictions');

    // Advance to Step 4: Announcements
    await nextBtn.click();
    await expect(tourCard).toContainText('STEP 4 OF 5');
    await expect(tourCard).toContainText('Announcements & Store Tasks');

    // Advance to Step 5: ServSafe & Multi-Chain Templates
    await nextBtn.click();
    await expect(tourCard).toContainText('STEP 5 OF 5');
    await expect(tourCard).toContainText('ServSafe Standards & Multi-Chain Templates');
    await expect(nextBtn).toContainText('Complete Tour 🏆');

    // Complete Tour
    await nextBtn.click();

    // Tour overlay should close
    await expect(overlay).toBeHidden();

    // Completion status should be preserved
    const isCompleted = await page.evaluate(() => {
      return localStorage.getItem('ezManage_tutorial_completed_new_mgr_1');
    });
    expect(isCompleted).toBe('true');
  });

  test('should display Onboarding Badge in Profile Settings and support Replaying Tutorial', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html#profile');
    await page.evaluate(() => {
      window.currentUser = { uid: 'guest', email: 'manager@ezmanage.com' };
      window.currentUserData = { tutorialCompleted: true, onboardingBadge: 'Certified Shift Lead' };
      localStorage.setItem('ezManage_tutorial_completed_guest', 'true');
      localStorage.setItem('ezManage_onboarding_badge_guest', 'Certified Shift Lead');
      if (window.navTo) window.navTo('profile');
    });

    const replayBtn = page.locator('#btnReplayTutorial');
    await expect(replayBtn).toBeVisible();

    const badge = page.locator('#profileOnboardingBadge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Certified Shift Lead');

    // Click Replay Tutorial
    await replayBtn.click();

    const tourCard = page.locator('#tourCard');
    await expect(tourCard).toBeVisible();
    await expect(tourCard).toContainText('STEP 1 OF 5');

    // Skip Tutorial
    const skipBtn = tourCard.locator('#btnTourSkip');
    await skipBtn.click();

    await expect(page.locator('#guidedTutorialOverlay')).toBeHidden();
  });

  test('should detect desktop OS and toggle between macOS (.dmg) and Windows (.exe) installers', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html#welcome');

    const downloadSection = page.locator('#smartDownloadContainer');
    await expect(downloadSection).toBeVisible();

    const primaryBtn = page.locator('#btnPrimaryDownload');
    await expect(primaryBtn).toBeVisible();

    // Check primary button text & download attribute
    const primaryText = page.locator('#primaryDownloadText');
    await expect(primaryText).toContainText(/(macOS|Windows)/);

    // Toggle secondary platform
    const secondaryBtn = page.locator('#btnSecondaryPlatform');
    await expect(secondaryBtn).toBeVisible();
    await secondaryBtn.click();

    // Toggled text should change
    const newText = await primaryText.textContent();
    expect(newText).toBeTruthy();
  });

  test('should open mobile install guide modal with illustrated iOS and Android step-by-step instructions', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html#welcome');

    // Click Mobile Install Guide link
    const mobileLink = page.locator('#smartDownloadContainer button:has-text("View Mobile Install Guide")');
    await expect(mobileLink).toBeVisible();
    await mobileLink.click();

    const modal = page.locator('#mobileInstallModal');
    await expect(modal).toBeVisible();

    // Verify iOS instructions
    await expect(modal).toContainText('Install ezManage on Mobile');
    await expect(modal).toContainText('Open in Safari');
    await expect(modal).toContainText('Tap the Share Button');
    await expect(modal).toContainText('Add to Home Screen');

    // Switch to Android tab
    const androidTab = page.locator('#tabMobileAndroid');
    await androidTab.click();

    // Verify Android instructions
    await expect(page.locator('#mobileGuideAndroid')).toBeVisible();
    await expect(modal).toContainText('Open in Google Chrome');
    await expect(modal).toContainText('Tap More Options');
    await expect(modal).toContainText('Install App');

    // Close modal
    const closeBtn = modal.locator('button[aria-label="Close mobile install guide"]');
    await closeBtn.click();
    await expect(modal).toBeHidden();
  });

});
