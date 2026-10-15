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
});
