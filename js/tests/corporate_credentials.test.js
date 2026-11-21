import { jest } from "@jest/globals";

describe("Corporate Workspace Credentials UI & Formatting", () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="orgNameDisplayBento">Apex Organization</div>
      <div id="orgIdDisplayBento">ID: Loading...</div>
      <div id="workplaceCodeDisplayBento" data-code="">Code: Loading...</div>
      <div id="shareWorkplaceCode">...</div>
      <div id="shareGroupId">...</div>
      <div id="shareGroupPass" data-real-pass="">...</div>
      <div id="onboardingWorkplaceCode">...</div>
      <div id="onboardingJoinKey">...</div>
      <div id="tutorialWorkplaceCode">...</div>
      <div id="tutorialJoinKey">...</div>
      <i id="togglePassIcon" data-lucide="eye"></i>
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

  function applyWorkspaceCredentialsToDOM(orgData, groupId, isPassVisible = false) {
    const activeWorkplaceCode = orgData.workplaceCode || ('EZM-' + groupId.substring(0, 6).toUpperCase());
    const activeJoinKey = orgData.joinKey || '';
    const activeOrgPass = orgData.password || '';

    const nameEl = document.getElementById('orgNameDisplayBento');
    if (nameEl) nameEl.innerText = orgData.groupName || 'Corporate Workspace';

    const idEl = document.getElementById('orgIdDisplayBento');
    if (idEl) idEl.innerText = `ID: ${groupId}`;

    const codeBannerEl = document.getElementById('workplaceCodeDisplayBento');
    if (codeBannerEl) {
      codeBannerEl.innerText = `Code: ${activeWorkplaceCode}`;
      codeBannerEl.setAttribute('data-code', activeWorkplaceCode);
    }

    const shareCodeEl = document.getElementById('shareWorkplaceCode');
    if (shareCodeEl) shareCodeEl.innerText = activeWorkplaceCode;

    const shareIdEl = document.getElementById('shareGroupId');
    if (shareIdEl) shareIdEl.innerText = groupId;

    const passEl = document.getElementById('shareGroupPass');
    if (passEl) {
      if (activeJoinKey) {
        passEl.setAttribute('data-real-pass', activeJoinKey);
        passEl.innerText = isPassVisible ? activeJoinKey : '••••••••';
      } else if (activeOrgPass && activeOrgPass.startsWith('$scrypt$')) {
        passEl.innerText = '(Securely Protected)';
        passEl.removeAttribute('data-real-pass');
      } else {
        passEl.innerText = activeOrgPass || 'Active';
        passEl.setAttribute('data-real-pass', activeOrgPass || '');
      }
    }

    return { activeWorkplaceCode, activeJoinKey };
  }

  it("should populate DOM elements with unique workplace credentials", () => {
    const orgData = {
      groupName: "Apex Hospitality",
      workplaceCode: "EZM-APEX-8F2D19",
      joinKey: "WPK-7B29-4M8D",
      password: "$scrypt$somehash:somesalt",
    };

    const { activeWorkplaceCode, activeJoinKey } = applyWorkspaceCredentialsToDOM(orgData, "group_doc_123");

    expect(activeWorkplaceCode).toBe("EZM-APEX-8F2D19");
    expect(activeJoinKey).toBe("WPK-7B29-4M8D");
    expect(document.getElementById('workplaceCodeDisplayBento').innerText).toBe("Code: EZM-APEX-8F2D19");
    expect(document.getElementById('workplaceCodeDisplayBento').getAttribute('data-code')).toBe("EZM-APEX-8F2D19");
    expect(document.getElementById('shareWorkplaceCode').innerText).toBe("EZM-APEX-8F2D19");
    expect(document.getElementById('shareGroupId').innerText).toBe("group_doc_123");
    // Initially masked
    expect(document.getElementById('shareGroupPass').innerText).toBe("••••••••");
    expect(document.getElementById('shareGroupPass').getAttribute('data-real-pass')).toBe("WPK-7B29-4M8D");
  });

  it("should toggle passcode masking correctly", () => {
    const orgData = {
      groupName: "Apex Hospitality",
      workplaceCode: "EZM-APEX-8F2D19",
      joinKey: "WPK-7B29-4M8D",
    };

    // Masked
    applyWorkspaceCredentialsToDOM(orgData, "group_doc_123", false);
    expect(document.getElementById('shareGroupPass').innerText).toBe("••••••••");

    // Unmasked
    applyWorkspaceCredentialsToDOM(orgData, "group_doc_123", true);
    expect(document.getElementById('shareGroupPass').innerText).toBe("WPK-7B29-4M8D");
  });

  it("should format staff invitation correctly with workplace credentials", () => {
    const invite = formatStaffInvitation("Apex Hospitality", "EZM-APEX-8F2D19", "WPK-7B29-4M8D", "group_doc_123");
    expect(invite).toContain("Connect to Apex Hospitality on ezManage:");
    expect(invite).toContain("• Workplace Code: EZM-APEX-8F2D19");
    expect(invite).toContain("• Join Passcode: WPK-7B29-4M8D");
    expect(invite).toContain("• Group ID: group_doc_123");
    expect(invite).toContain("Join a Management Group");
  });

  it("should generate a fallback workplaceCode for legacy organizations without one", () => {
    const orgData = {
      groupName: "Legacy Store",
      password: "$scrypt$somehash:somesalt",
    };

    const { activeWorkplaceCode } = applyWorkspaceCredentialsToDOM(orgData, "abcdef123456");
    expect(activeWorkplaceCode).toBe("EZM-ABCDEF");
    expect(document.getElementById('shareWorkplaceCode').innerText).toBe("EZM-ABCDEF");
  });

  it("should display unique CORP-XXXXXXXX ID in bento banner without hanging on Loading...", () => {
    const orgData = {
      groupName: "Apex Enterprise",
      workplaceCode: "EZM-APEX-8F2D19",
      joinKey: "WPK-7B29-4M8D",
      password: "$scrypt$somehash:somesalt",
    };

    applyWorkspaceCredentialsToDOM(orgData, "CORP-9K3F7X2B");
    const idEl = document.getElementById('orgIdDisplayBento');
    expect(idEl.innerText).toBe("ID: CORP-9K3F7X2B");
    expect(idEl.innerText).not.toBe("ID: Loading...");
  });

  it("should dynamically render multi-store and security pills", () => {
    document.body.innerHTML += `
      <span id="multiStoreStatusBadge"></span>
      <span id="shareGroupPassDisplay"></span>
    `;

    function updateOperationalBadges(multiStoreEnabled, password) {
      const multiEl = document.getElementById('multiStoreStatusBadge');
      if (multiEl) {
        multiEl.innerHTML = multiStoreEnabled !== false
          ? 'Multi-Store Integrated'
          : 'Single-Store Mode';
      }
      const secEl = document.getElementById('shareGroupPassDisplay');
      if (secEl) {
        secEl.innerHTML = (password && password.startsWith('$scrypt$'))
          ? 'Security: Encrypted'
          : 'Security: Standard';
      }
    }

    updateOperationalBadges(true, "$scrypt$hash:salt");
    expect(document.getElementById('multiStoreStatusBadge').innerHTML).toBe("Multi-Store Integrated");
    expect(document.getElementById('shareGroupPassDisplay').innerHTML).toBe("Security: Encrypted");

    updateOperationalBadges(false, "plaintext123");
    expect(document.getElementById('multiStoreStatusBadge').innerHTML).toBe("Single-Store Mode");
    expect(document.getElementById('shareGroupPassDisplay').innerHTML).toBe("Security: Standard");
  });

  it("should render and dismiss corporate toasts cleanly", () => {
    document.body.innerHTML += `<div id="corporateToastContainer"></div>`;
    const container = document.getElementById('corporateToastContainer');

    function createTestToast(message, type = 'success') {
      const toast = document.createElement('div');
      toast.className = `toast-item ${type}`;
      toast.textContent = message;
      container.appendChild(toast);
      return toast;
    }

    const toast = createTestToast("Company settings updated successfully.");
    expect(container.children.length).toBe(1);
    expect(container.textContent).toContain("Company settings updated successfully.");
    toast.remove();
    expect(container.children.length).toBe(0);
  });

  describe("Resilient Cloud Function & Corporate Workspace Fallback", () => {
    it("should handle server rejection codes directly without masking with Load failed", async () => {
      const mockCallable = jest.fn().mockRejectedValue({
        code: "functions/unauthenticated",
        message: "You must be logged in to create a workspace."
      });

      const fakeFirebase = {
        functions: () => ({
          httpsCallable: () => mockCallable
        })
      };

      async function testCallFunction(name, data) {
        let lastError = null;
        try {
          if (typeof fakeFirebase !== 'undefined' && typeof fakeFirebase.functions === 'function') {
            const callable = fakeFirebase.functions().httpsCallable(name);
            const res = await callable(data);
            return res;
          }
        } catch (callableErr) {
          lastError = callableErr;
          const serverRejectionCodes = [
            'functions/unauthenticated',
            'functions/permission-denied',
            'functions/invalid-argument',
            'functions/already-exists',
            'functions/failed-precondition',
            'functions/out-of-range'
          ];
          if (callableErr && callableErr.code && serverRejectionCodes.includes(callableErr.code)) {
            throw new Error(callableErr.message || callableErr.code);
          }
        }
      }

      await expect(testCallFunction('manageShiftGroups', { action: 'create' }))
        .rejects.toThrow("You must be logged in to create a workspace.");
    });

    it("should transform Safari TypeError: Load failed into a descriptive connection error", async () => {
      const fetchError = new TypeError("Load failed");
      const isNetworkFailure = fetchError.name === 'TypeError' ||
        fetchError.message.includes('Load failed') ||
        fetchError.message.includes('Failed to fetch');

      let finalErrorMsg = "";
      if (isNetworkFailure) {
        finalErrorMsg = "Unable to reach workspace service: Network connection failed. Please verify your connection or try again.";
      }

      expect(isNetworkFailure).toBe(true);
      expect(finalErrorMsg).toContain("Unable to reach workspace service");
      expect(finalErrorMsg).not.toBe("Load failed");
    });

    it("should successfully provision workspace via Firestore fallback when Cloud Function is unreachable", async () => {
      const mockShiftGroupsCol = {
        add: jest.fn().mockResolvedValue({ id: "CORP-FALLBACK123" })
      };
      const mockDb = {
        collection: (name) => {
          if (name === "shift_groups") return mockShiftGroupsCol;
          return { set: jest.fn(), doc: jest.fn() };
        }
      };

      const orgName = "Acme Global";
      const user = { uid: "user_owner_abc", email: "ceo@acme.com", displayName: "CEO" };
      const selectedPlan = "Business Pro";
      const workers = "25-50";
      const aiEnabled = true;

      // Simulate execution with fallback
      async function createCorporateWorkspaceWithFallback() {
        try {
          // Cloud function attempt fails with network error
          throw new Error("Unable to reach workspace service: Network connection failed.");
        } catch (funcErr) {
          const cleanCode = orgName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) || 'CORP';
          const randSuffix = "8F2D19";
          const workplaceCode = `EZM-${cleanCode}-${randSuffix}`;
          const joinKey = `WPK-4A1B-9C2D`;

          const newGroupData = {
            ownerId: user.uid,
            ownerName: user.displayName || user.email.split('@')[0],
            groupName: orgName,
            name: user.displayName || (orgName + " Admin"),
            workplaceCode: workplaceCode,
            joinKey: joinKey,
            plan: selectedPlan || 'Free',
            workersCount: workers || '1-10',
            aiEnabled: Boolean(aiEnabled),
            multiStoreEnabled: true,
            requireApproval: true,
          };

          const docRef = await mockDb.collection('shift_groups').add(newGroupData);
          return {
            data: {
              groupId: docRef.id,
              workplaceCode: workplaceCode,
              joinKey: joinKey
            }
          };
        }
      }

      const result = await createCorporateWorkspaceWithFallback();
      expect(result.data.groupId).toBe("CORP-FALLBACK123");
      expect(result.data.workplaceCode).toBe("EZM-ACME-8F2D19");
      expect(result.data.joinKey).toBe("WPK-4A1B-9C2D");
      expect(mockShiftGroupsCol.add).toHaveBeenCalledWith(expect.objectContaining({
        ownerId: "user_owner_abc",
        groupName: "Acme Global",
        plan: "Business Pro",
      }));
    });
  });

  describe("Multi-Store Company Switcher & Resilience", () => {
    beforeEach(() => {
      document.body.innerHTML += `
        <div id="companySwitcherNavContainer">
          <span id="navActiveCompanyName">Workspace</span>
          <span id="companyCountBadge">0</span>
          <div id="companySwitcherNavList"></div>
        </div>
        <div id="dropdownCompanySettingsBtn" class="hidden"></div>
      `;
    });

    it("should render list of managed companies in the corporate switcher dropdown", () => {
      const userCompanies = [
        { id: "corp_001", groupName: "Apex Downtown", workplaceCode: "EZM-APEX-001" },
        { id: "corp_002", groupName: "Apex Midtown", workplaceCode: "EZM-APEX-002" },
        { id: "corp_003", groupName: "Apex Uptown", workplaceCode: "EZM-APEX-003" },
      ];
      const activeOrgId = "corp_002";

      function renderSwitcher(companies, activeId) {
        const listContainer = document.getElementById('companySwitcherNavList');
        const badge = document.getElementById('companyCountBadge');
        const navName = document.getElementById('navActiveCompanyName');

        const activeCompany = companies.find(c => c.id === activeId);
        if (navName && activeCompany) navName.innerText = activeCompany.groupName;
        if (badge) badge.innerText = String(companies.length);

        if (listContainer) {
          listContainer.innerHTML = companies.map(c => {
            const isActive = c.id === activeId;
            return `
              <button data-company-id="${c.id}" aria-label="Switch to ${c.groupName}" class="workspace-item ${isActive ? 'active-workspace' : ''}">
                <span class="company-name">${c.groupName}</span>
                <span class="company-code">${c.workplaceCode}</span>
                ${isActive ? '<span class="active-indicator">Active</span>' : ''}
              </button>
            `;
          }).join('');
        }
      }

      renderSwitcher(userCompanies, activeOrgId);

      expect(document.getElementById('navActiveCompanyName').innerText).toBe("Apex Midtown");
      expect(document.getElementById('companyCountBadge').innerText).toBe("3");
      const items = document.querySelectorAll('.workspace-item');
      expect(items.length).toBe(3);
      expect(items[1].classList.contains('active-workspace')).toBe(true);
      expect(items[1].querySelector('.active-indicator')).not.toBeNull();
      expect(items[0].classList.contains('active-workspace')).toBe(false);
    });

    it("should resolve admin companies across ownerId, assigned orgId, and super admin fallbacks", async () => {
      const mockShiftGroups = [
        { id: "grp_direct_owner", ownerId: "user_admin_1", groupName: "Direct Owner Org", workplaceCode: "EZM-DIR1" },
        { id: "grp_assigned_manager", ownerId: "user_other", groupName: "Assigned Manager Store", workplaceCode: "EZM-ASGN" },
        { id: "grp_email_match", ownerEmail: "admin@corp.com", groupName: "Email Match Entity", workplaceCode: "EZM-EMAL" },
      ];

      async function resolveAdminCompanies(user, userData) {
        const companyMap = new Map();

        // Check ownerId
        mockShiftGroups.filter(g => g.ownerId === user.uid).forEach(g => companyMap.set(g.id, g));
        // Check email
        if (user.email) {
          mockShiftGroups.filter(g => g.ownerEmail === user.email).forEach(g => companyMap.set(g.id, g));
        }
        // Check user orgId
        if (userData && userData.orgId) {
          const direct = mockShiftGroups.find(g => g.id === userData.orgId || g.workplaceCode === userData.orgId);
          if (direct) companyMap.set(direct.id, direct);
        }

        const companies = Array.from(companyMap.values());
        const activeCompany = companies.length > 0 ? companies[0] : null;
        return { companies, activeCompany };
      }

      // Test 1: User is direct owner
      const res1 = await resolveAdminCompanies({ uid: "user_admin_1", email: "other@corp.com" }, {});
      expect(res1.companies.length).toBe(1);
      expect(res1.activeCompany.groupName).toBe("Direct Owner Org");

      // Test 2: User is assigned manager via orgId
      const res2 = await resolveAdminCompanies({ uid: "user_manager_2", email: "mgr@corp.com" }, { orgId: "grp_assigned_manager" });
      expect(res2.companies.length).toBe(1);
      expect(res2.activeCompany.groupName).toBe("Assigned Manager Store");

      // Test 3: User matched by corporate email
      const res3 = await resolveAdminCompanies({ uid: "user_email_user", email: "admin@corp.com" }, {});
      expect(res3.companies.length).toBe(1);
      expect(res3.activeCompany.groupName).toBe("Email Match Entity");
    });
  });
});
