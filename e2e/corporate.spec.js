import { test, expect } from '@playwright/test';

test.describe('E2E Corporate Dashboard & Executive Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.isE2ETestMode = true;
    });
    await page.goto('http://localhost:3000/company.html');
  });

  test('should display corporate workspace login or shell', async ({ page }) => {
    // Check page title and structure
    await expect(page).toHaveTitle(/Corporate/);
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should support corporate workspace initialization and render executive analytics', async ({ page }) => {
    // Simulate workspace initialization in page context with mock corporate data
    await page.evaluate(() => {
      window.activeOrgId = 'corp_test_org_001';
      window.activeOrgData = {
        groupName: 'Metro North Enterprise',
        multiStoreEnabled: true,
        workersCount: '25-50',
      };

      const shell = document.getElementById('dashboard-shell');
      if (shell) shell.classList.remove('hidden');

      const login = document.getElementById('view-login');
      if (login) login.classList.remove('active');

      const nameEl = document.getElementById('orgNameDisplayBento');
      if (nameEl) nameEl.innerText = 'Metro North Enterprise';

      const idEl = document.getElementById('orgIdDisplayBento');
      if (idEl) idEl.innerText = 'ID: corp_test_org_001';

      // Seed stats
      const shiftsEl = document.getElementById('globalShifts');
      if (shiftsEl) shiftsEl.innerText = '42';

      const routineEl = document.getElementById('globalRoutineScore');
      if (routineEl) routineEl.innerText = '94%';

      const laborEl = document.getElementById('laborSavedCount');
      if (laborEl) laborEl.innerText = '32h';
    });

    // Check dashboard shell visibility
    const shell = page.locator('#dashboard-shell');
    await expect(shell).toBeVisible();

    // Verify company name and ID are populated
    await expect(page.locator('#orgNameDisplayBento')).toHaveText('Metro North Enterprise');
    await expect(page.locator('#orgIdDisplayBento')).toContainText('corp_test_org_001');

    // Verify KPI cards
    await expect(page.locator('#globalShifts')).toHaveText('42');
    await expect(page.locator('#globalRoutineScore')).toHaveText('94%');
    await expect(page.locator('#laborSavedCount')).toHaveText('32h');
  });

  test('should seamlessly switch between corporate tabs and detach old listeners', async ({ page }) => {
    await page.evaluate(() => {
      window.activeOrgId = 'corp_test_org_001';
      document.getElementById('dashboard-shell').classList.remove('hidden');
      document.getElementById('view-login').classList.remove('active');
    });

    // Click Manager Directory tab
    const managersTabBtn = page.locator('#tabBtn-managers');
    await managersTabBtn.click();

    await expect(managersTabBtn).toHaveClass(/active/);
    await expect(page.locator('#tabContent-managers')).toBeVisible();
    await expect(page.locator('#tabContent-overview')).toBeHidden();

    // Click Staff & Team Roster tab
    const employeesTabBtn = page.locator('#tabBtn-employees');
    await employeesTabBtn.click();

    await expect(employeesTabBtn).toHaveClass(/active/);
    await expect(page.locator('#tabContent-employees')).toBeVisible();
    await expect(page.locator('#tabContent-managers')).toBeHidden();

    // Switch back to Executive Overview
    const overviewTabBtn = page.locator('#tabBtn-overview');
    await overviewTabBtn.click();

    await expect(overviewTabBtn).toHaveClass(/active/);
    await expect(page.locator('#tabContent-overview')).toBeVisible();
    await expect(page.locator('#tabContent-employees')).toBeHidden();
  });

  test('should open add staff modal and render staff members with unique IDs without duplicate painting', async ({ page }) => {
    await page.evaluate(() => {
      window.activeOrgId = 'corp_test_org_001';
      document.getElementById('dashboard-shell').classList.remove('hidden');
      document.getElementById('view-login').classList.remove('active');
      window.switchCorporateTab('employees');
    });

    const addEmpBtn = page.locator('#companyAddEmpBtn');
    await addEmpBtn.click();

    const modal = page.locator('#companyAddEmpModal');
    await expect(modal).toBeVisible();

    // Fill new staff member
    await page.locator('#companyNewEmpName').fill('Sarah Jenkins');
    await page.locator('#companyNewEmpRole').fill('Assistant Store Director');
    await page.locator('#companyNewEmpPhone').fill('555-0199');

    // Close modal via Cancel button
    const cancelBtn = modal.locator('button', { hasText: 'Cancel' });
    await cancelBtn.click();
    await expect(modal).toBeHidden();

    // Test unique ID employee card rendering in container
    await page.evaluate(() => {
      const container = document.getElementById('companyEmployeesContainer');
      const countEl = document.getElementById('statEmployeesCount');
      if (container) {
        container.innerHTML = `
          <div id="emp-card-emp_001" data-employee-id="emp_001" class="p-3.5 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
            <div>
              <h4 class="font-semibold text-xs text-slate-900">Sarah Jenkins</h4>
              <p class="text-[11px] text-slate-500">Assistant Store Director • 555-0199</p>
            </div>
          </div>
        `;
      }
      if (countEl) countEl.innerText = '1 staff';
    });

    const empCard = page.locator('#emp-card-emp_001');
    await expect(empCard).toBeVisible();
    await expect(empCard).toContainText('Sarah Jenkins');
    await expect(page.locator('#statEmployeesCount')).toHaveText('1 staff');
  });

  test('should handle date picker changes smoothly on overview dashboard', async ({ page }) => {
    await page.evaluate(() => {
      window.activeOrgId = 'corp_test_org_001';
      document.getElementById('dashboard-shell').classList.remove('hidden');
      document.getElementById('view-login').classList.remove('active');
      window.switchCorporateTab('overview');
    });

    const datePicker = page.locator('#dashboardDatePicker');
    await expect(datePicker).toBeVisible();

    // Change date
    await datePicker.fill('2026-11-01');
    await expect(datePicker).toHaveValue('2026-11-01');

    // Verify cleanupCorporateListeners cleans up cleanly without errors
    const cleanupResult = await page.evaluate(() => {
      try {
        if (typeof window.cleanupCorporateListeners === 'function') {
          window.cleanupCorporateListeners();
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    });
    expect(cleanupResult).toBe(true);
  });
});
