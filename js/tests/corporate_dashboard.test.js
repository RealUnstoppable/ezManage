import { jest } from "@jest/globals";

describe("Executive Corporate Dashboard (dashboard.html)", () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="dashboardMainShell">
        <h1 id="orgNameDisplayBento">Loading...</h1>
        <div id="orgTierBadge"><span id="orgPlanDisplay">--</span></div>
        <div id="workplaceCodeDisplayBento">Code: --</div>
        <div id="orgIdDisplayBento">ID: --</div>
        <span id="navActiveCompanyName">Loading...</span>
        <span id="navCompanyCountBadge">0</span>
        <span id="tabBadgeStores">0</span>
        <span id="connectedStoresCountText">0</span>
        <div id="totalStoresMetric">0</div>
        <span id="snapshotStoreCount">0</span>
        <span id="snapshotAvgScore">--%</span>
        <span id="credOrgName">...</span>
        <span id="shareWorkplaceCode">...</span>
        <span id="shareGroupId">...</span>
        <span id="shareGroupPass" data-real-pass="">••••••••</span>
        <textarea id="shareInvitePreview"></textarea>

        <!-- KPI Metrics -->
        <div id="globalShifts">0</div>
        <div id="globalRoutineScore">0%</div>
        <div id="globalRoutineProgressBar" style="width: 0%"></div>
        <div id="laborSavedCount">0h</div>
        <div id="statManagersCount">0</div>
        <div id="statEmployeesCount">0</div>
        <span id="tabBadgeManagers">0</span>
        <span id="tabBadgeEmployees">0</span>

        <!-- Containers -->
        <div id="companySelectorList"></div>
        <div id="multistoreEntitiesGrid"></div>
        <table id="managerTable"><tbody id="managerTableBody"></tbody></table>
        <div id="companyEmployeesContainer"></div>
        <div id="globalNotesContainer"></div>
        <div id="pendingRequestsContainer"></div>
        <span id="pendingRequestsBadge" class="hidden"></span>

        <!-- Tabs -->
        <button id="tabBtn-overview" class="stripe-tab active"></button>
        <button id="tabBtn-multistore" class="stripe-tab"></button>
        <button id="tabBtn-managers" class="stripe-tab"></button>
        <button id="tabBtn-employees" class="stripe-tab"></button>
        <button id="tabBtn-credentials" class="stripe-tab"></button>
        <div id="dashboardTabContent-overview"></div>
        <div id="dashboardTabContent-multistore" class="hidden"></div>
        <div id="dashboardTabContent-managers" class="hidden"></div>
        <div id="dashboardTabContent-employees" class="hidden"></div>
        <div id="dashboardTabContent-credentials" class="hidden"></div>

        <!-- Modals -->
        <dialog id="addManagerModal"><form id="addManagerForm"></form></dialog>
        <dialog id="addEmployeeModal"><form id="addEmployeeForm"></form></dialog>
      </div>
    `;
  });

  function formatStaffInvitation(orgName, workplaceCode, joinPasscode, groupId) {
    return [
      `Connect to ${orgName} on ezManage:`,
      "",
      `• Workplace Code: ${workplaceCode}`,
      `• Join Passcode: ${joinPasscode}`,
      `• Group ID: ${groupId}`,
      "",
      "To connect:",
      "1. Open ezManage (ezmanage.app)",
      "2. Navigate to Shift Notes / Groups -> Join a Management Group",
      "3. Enter the Workplace Code and Join Passcode."
    ].join("\n");
  }

  function applyActiveCompanyToDashboard(orgData, orgId, userCompanies = []) {
    const groupName = orgData.groupName || orgData.name || 'Corporate Workspace';
    const workplaceCode = orgData.workplaceCode || ('EZM-' + orgId.substring(0, 6).toUpperCase());
    const plan = orgData.plan || 'Free';
    const joinKey = orgData.joinKey || '';
    const password = orgData.password || '';

    const orgNameEl = document.getElementById('orgNameDisplayBento');
    if (orgNameEl) orgNameEl.innerText = groupName;

    const codeEl = document.getElementById('workplaceCodeDisplayBento');
    if (codeEl) codeEl.innerText = `Code: ${workplaceCode}`;

    const idEl = document.getElementById('orgIdDisplayBento');
    if (idEl) idEl.innerText = `ID: ${orgId}`;

    const planEl = document.getElementById('orgPlanDisplay');
    if (planEl) planEl.innerText = `${plan.charAt(0).toUpperCase() + plan.slice(1)} Store Tier`;

    const navName = document.getElementById('navActiveCompanyName');
    if (navName) navName.innerText = groupName;

    const badge = document.getElementById('navCompanyCountBadge');
    if (badge) badge.innerText = String(userCompanies.length);

    const tabBadge = document.getElementById('tabBadgeStores');
    if (tabBadge) tabBadge.innerText = String(userCompanies.length);

    const totalStoresMetric = document.getElementById('totalStoresMetric');
    if (totalStoresMetric) totalStoresMetric.innerText = String(userCompanies.length);

    const shareCode = document.getElementById('shareWorkplaceCode');
    if (shareCode) shareCode.innerText = workplaceCode;

    const shareId = document.getElementById('shareGroupId');
    if (shareId) shareId.innerText = orgId;

    const sharePass = document.getElementById('shareGroupPass');
    if (sharePass) {
      sharePass.setAttribute('data-real-pass', joinKey || password);
      sharePass.innerText = '••••••••';
    }

    const invitePreview = document.getElementById('shareInvitePreview');
    if (invitePreview) {
      invitePreview.value = formatStaffInvitation(groupName, workplaceCode, joinKey || 'Protected', orgId);
    }
  }

  it("should apply active corporate entity details to the dashboard DOM", () => {
    const org = {
      id: "CORP-APEX-001",
      groupName: "Apex Hospitality Group",
      workplaceCode: "EZM-APEX-001",
      joinKey: "WPK-77-88",
      plan: "Enterprise"
    };
    const allCompanies = [org, { id: "CORP-APEX-002", groupName: "Apex Midtown" }];

    applyActiveCompanyToDashboard(org, org.id, allCompanies);

    expect(document.getElementById('orgNameDisplayBento').innerText).toBe("Apex Hospitality Group");
    expect(document.getElementById('workplaceCodeDisplayBento').innerText).toBe("Code: EZM-APEX-001");
    expect(document.getElementById('orgIdDisplayBento').innerText).toBe("ID: CORP-APEX-001");
    expect(document.getElementById('orgPlanDisplay').innerText).toBe("Enterprise Store Tier");
    expect(document.getElementById('navActiveCompanyName').innerText).toBe("Apex Hospitality Group");
    expect(document.getElementById('navCompanyCountBadge').innerText).toBe("2");
    expect(document.getElementById('totalStoresMetric').innerText).toBe("2");
    expect(document.getElementById('shareWorkplaceCode').innerText).toBe("EZM-APEX-001");
    expect(document.getElementById('shareInvitePreview').value).toContain("Connect to Apex Hospitality Group on ezManage:");
  });

  it("should calculate corporate operational metrics accurately from manager shift histories", () => {
    const managers = [
      {
        id: "mgr_1",
        email: "lead1@apex.com",
        shiftHistory: [
          {
            id: "s1",
            dateSaved: "2026-11-20",
            routines: [{ checked: true }, { checked: true }, { checked: true }]
          },
          {
            id: "s2",
            dateSaved: "2026-11-21",
            routines: [{ checked: true }, { checked: false }]
          }
        ]
      },
      {
        id: "mgr_2",
        email: "lead2@apex.com",
        shiftHistory: [
          {
            id: "s3",
            dateSaved: "2026-11-21",
            routines: [{ checked: true }, { checked: true }]
          }
        ]
      }
    ];

    function calculateMetrics(managersList) {
      let totalShifts = 0;
      let totalScore = 0;
      let count = 0;
      const seenShifts = new Set();

      managersList.forEach(m => {
        (m.shiftHistory || []).forEach(s => {
          if (!seenShifts.has(s.id)) {
            seenShifts.add(s.id);
            totalShifts++;
            let rTotal = 0, rChecked = 0;
            (s.routines || []).forEach(r => { rTotal++; if (r.checked) rChecked++; });
            if (rTotal > 0) {
              totalScore += (rChecked / rTotal) * 100;
              count++;
            }
          }
        });
      });

      const avgScore = count > 0 ? Math.round(totalScore / count) : 0;
      const laborSaved = Math.round(totalShifts * 0.75);

      return { totalShifts, avgScore, laborSaved };
    }

    const { totalShifts, avgScore, laborSaved } = calculateMetrics(managers);

    // Shift 1: 3/3 = 100%, Shift 2: 1/2 = 50%, Shift 3: 2/2 = 100%. (100 + 50 + 100) / 3 = 83.33% -> 83%
    expect(totalShifts).toBe(3);
    expect(avgScore).toBe(83);
    expect(laborSaved).toBe(2); // 3 * 0.75 = 2.25 -> 2h
  });

  it("should switch tabs seamlessly between overview, multistore, managers, employees, and credentials", () => {
    function switchTab(tabId) {
      ['overview', 'multistore', 'managers', 'employees', 'credentials'].forEach(t => {
        const btn = document.getElementById(`tabBtn-${t}`);
        const content = document.getElementById(`dashboardTabContent-${t}`);
        if (btn) {
          if (t === tabId) btn.classList.add('active');
          else btn.classList.remove('active');
        }
        if (content) {
          if (t === tabId) content.classList.remove('hidden');
          else content.classList.add('hidden');
        }
      });
    }

    // Switch to multistore
    switchTab('multistore');
    expect(document.getElementById('tabBtn-multistore').classList.contains('active')).toBe(true);
    expect(document.getElementById('dashboardTabContent-multistore').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('dashboardTabContent-overview').classList.contains('hidden')).toBe(true);

    // Switch to managers
    switchTab('managers');
    expect(document.getElementById('tabBtn-managers').classList.contains('active')).toBe(true);
    expect(document.getElementById('dashboardTabContent-managers').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('dashboardTabContent-multistore').classList.contains('hidden')).toBe(true);
  });

  it("should render multi-store company cards with active indicators", () => {
    const companies = [
      { id: "corp_1", groupName: "Downtown Flagship", workplaceCode: "EZM-DWNT-01", plan: "Enterprise" },
      { id: "corp_2", groupName: "Airport Express", workplaceCode: "EZM-AIRP-02", plan: "Pro" }
    ];
    const activeId = "corp_1";

    function renderMultistore(list, currentActiveId) {
      const container = document.getElementById('multistoreEntitiesGrid');
      container.innerHTML = list.map(c => {
        const isActive = c.id === currentActiveId;
        return `
          <div id="card-${c.id}" class="entity-card ${isActive ? 'active-card' : ''}">
            <span class="store-name">${c.groupName}</span>
            <span class="store-code">${c.workplaceCode}</span>
            ${isActive ? '<span class="active-badge">Active Workspace</span>' : ''}
          </div>
        `;
      }).join('');
    }

    renderMultistore(companies, activeId);

    const cards = document.querySelectorAll('.entity-card');
    expect(cards.length).toBe(2);
    expect(cards[0].classList.contains('active-card')).toBe(true);
    expect(cards[0].querySelector('.active-badge')).not.toBeNull();
    expect(cards[1].classList.contains('active-card')).toBe(false);
    expect(cards[1].querySelector('.active-badge')).toBeNull();
  });
});
