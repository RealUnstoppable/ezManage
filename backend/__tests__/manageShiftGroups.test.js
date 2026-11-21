const crypto = require("crypto");

const mockMethods = {
  add: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  get: jest.fn(),
  doc: jest.fn(),
  where: jest.fn(),
  limit: jest.fn(),
  collection: jest.fn(),
};

jest.mock("firebase-admin", () => {
  const firestoreObj = {
    collection: (...args) => mockMethods.collection(...args),
    doc: (...args) => mockMethods.doc(...args),
    where: (...args) => mockMethods.where(...args),
    limit: (...args) => mockMethods.limit(...args),
    get: (...args) => mockMethods.get(...args),
    set: (...args) => mockMethods.set(...args),
    update: (...args) => mockMethods.update(...args),
    add: (...args) => mockMethods.add(...args),
  };

  return {
    initializeApp: jest.fn(),
    firestore: Object.assign(jest.fn(() => firestoreObj), {
      FieldValue: {serverTimestamp: jest.fn(() => "MOCK_TIMESTAMP")},
    }),
  };
});

const {
  handleCreateShiftGroup,
  handleRequestJoinShiftGroup,
  handleRotateWorkplaceCredentials,
  handleAddManagerShiftGroup,
  handleUpdateProfile,
  handleUpdateCompanyShiftGroup,
  handleGetAdminCompanies,
  handleSwitchCompany,
  generateUniqueCorporateId,
  generateUniqueWorkplaceCode,
  generateUniqueWorkplaceKey,
} = require("../index");
const {HttpsError} = require("firebase-functions/v1/https");

describe("Workplace Credentials & Corporate ID Helpers", () => {
  it("generateUniqueWorkplaceCode should format code with EZM prefix and company name", () => {
    const code = generateUniqueWorkplaceCode("Apex Hospitality");
    expect(code).toMatch(/^EZM-APEX-[A-F0-9]{6}$/);
  });

  it("generateUniqueWorkplaceCode should fallback to CORP if no alphabetic chars", () => {
    const code = generateUniqueWorkplaceCode("$$$");
    expect(code).toMatch(/^EZM-CORP-[A-F0-9]{6}$/);
  });

  it("generateUniqueWorkplaceKey should generate formatted key", () => {
    const key = generateUniqueWorkplaceKey();
    expect(key).toMatch(/^WPK-[A-F0-9]{4}-[A-F0-9]{4}$/);
  });

  it("generateUniqueWorkplaceKey should produce unique keys each call", () => {
    const key1 = generateUniqueWorkplaceKey();
    const key2 = generateUniqueWorkplaceKey();
    expect(key1).not.toBe(key2);
  });

  it("generateUniqueCorporateId should generate deterministic 8-char CORP- identifier without ambiguous chars", () => {
    const id = generateUniqueCorporateId();
    expect(id).toMatch(/^CORP-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
    const suffix = id.replace("CORP-", "");
    expect(suffix).not.toMatch(/[01OI]/);
  });

  it("generateUniqueCorporateId should generate unique IDs on consecutive invocations", () => {
    const id1 = generateUniqueCorporateId();
    const id2 = generateUniqueCorporateId();
    expect(id1).not.toBe(id2);
  });
});

describe("handleCreateShiftGroup with Workplace Credentials & Corporate ID", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMethods.add.mockResolvedValue({id: "new_group_123"});
    mockMethods.set.mockResolvedValue(true);
    mockMethods.get.mockResolvedValue({exists: false});
    mockMethods.doc.mockReturnValue({
      set: mockMethods.set,
      get: mockMethods.get,
    });
    mockMethods.collection.mockImplementation((name) => {
      if (name === "shift_groups") {
        return {
          add: mockMethods.add,
          doc: mockMethods.doc,
        };
      }
      if (name === "users") return {doc: mockMethods.doc};
      return mockMethods;
    });
  });

  it("should create shift group with unique CORP- document ID and atomic CorporateAdmin role", async () => {
    const payload = {
      groupName: "Starbucks Store #402",
      ownerName: "Manager Dave",
      plan: "Pro",
      workersCount: "11-50",
      aiEnabled: true,
    };

    const result = await handleCreateShiftGroup(payload, "user_owner_1");

    expect(result.success).toBe(true);
    expect(result.groupId).toMatch(/^CORP-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
    expect(result.workplaceCode).toMatch(/^EZM-STAR-[A-F0-9]{6}$/);
    expect(result.joinKey).toMatch(/^WPK-[A-F0-9]{4}-[A-F0-9]{4}$/);

    expect(mockMethods.doc).toHaveBeenCalledWith(result.groupId);
    expect(mockMethods.set).toHaveBeenCalledTimes(2); // shift_groups doc and user doc

    const savedGroup = mockMethods.set.mock.calls[0][0];
    expect(savedGroup.groupName).toBe("Starbucks Store #402");
    expect(savedGroup.workplaceCode).toBe(result.workplaceCode);
    expect(savedGroup.joinKey).toBe(result.joinKey);
    expect(savedGroup.multiStoreEnabled).toBe(true);
    expect(savedGroup.aiEnabled).toBe(true);
    expect(savedGroup.workersCount).toBe("11-50");
    // Password must be hashed with scrypt
    expect(savedGroup.password).toMatch(/^\$scrypt\$[a-f0-9]+:[a-f0-9]+$/);

    // Verify hash can be authenticated with scrypt
    const [hash, salt] = savedGroup.password.substring(8).split(":");
    const derived = crypto.scryptSync(result.joinKey, salt, 64).toString("hex");
    expect(derived).toBe(hash);

    // User doc updated atomically via Admin SDK with CorporateAdmin role and configs
    expect(mockMethods.collection).toHaveBeenCalledWith("users");
    expect(mockMethods.doc).toHaveBeenCalledWith("user_owner_1");
    expect(mockMethods.set).toHaveBeenCalledWith({
      orgId: result.groupId,
      role: "CorporateAdmin",
      plan: "Pro",
      workersCount: "11-50",
      aiEnabled: true,
      name: "Manager Dave",
    }, {merge: true});
  });

  it("should allow custom joinKey and workplaceCode if provided", async () => {
    const payload = {
      groupName: "Custom Group",
      workplaceCode: "EZM-CUSTOM-1111",
      joinKey: "WPK-9999-0000",
    };

    const result = await handleCreateShiftGroup(payload, "user_owner_2");
    expect(result.workplaceCode).toBe("EZM-CUSTOM-1111");
    expect(result.joinKey).toBe("WPK-9999-0000");

    const savedGroup = mockMethods.set.mock.calls[0][0];
    expect(savedGroup.workplaceCode).toBe("EZM-CUSTOM-1111");
    expect(savedGroup.joinKey).toBe("WPK-9999-0000");
  });
});

describe("handleRequestJoinShiftGroup with Workplace Code and ID", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should resolve group by workplaceCode when doc ID is not found", async () => {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync("WPK-TEST-1234", salt, 64).toString("hex");
    const hashedPassword = `$scrypt$${hash}:${salt}`;

    const mockGroupDoc = {
      id: "group_resolved_by_code_id",
      exists: true,
      data: () => ({
        password: hashedPassword,
        workplaceCode: "EZM-TEST-ABC123",
      }),
    };

    const docGetter = jest.fn().mockResolvedValue({exists: false});
    const whereGetter = jest.fn().mockResolvedValue({
      empty: false,
      docs: [mockGroupDoc],
    });

    mockMethods.doc.mockReturnValue({get: docGetter});
    mockMethods.limit.mockReturnValue({get: whereGetter});
    mockMethods.where.mockReturnValue({limit: mockMethods.limit});
    mockMethods.add.mockResolvedValue({id: "request_123"});

    mockMethods.collection.mockImplementation((col) => {
      if (col === "shift_groups") {
        return {doc: mockMethods.doc, where: mockMethods.where};
      }
      if (col === "shift_group_requests") {
        return {add: mockMethods.add};
      }
      return mockMethods;
    });

    const result = await handleRequestJoinShiftGroup(
      {
        groupId: "EZM-TEST-ABC123",
        password: "WPK-TEST-1234",
        userName: "Manager Sarah",
      },
      "user_joining_1"
    );

    expect(result.success).toBe(true);
    expect(result.groupId).toBe("group_resolved_by_code_id");
    expect(mockMethods.add).toHaveBeenCalledWith({
      groupId: "group_resolved_by_code_id",
      userId: "user_joining_1",
      userName: "Manager Sarah",
      status: "Pending",
      timestamp: "MOCK_TIMESTAMP",
    });
  });
});

describe("handleRotateWorkplaceCredentials", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should rotate joinKey when authorized by owner", async () => {
    const mockGroupDoc = {
      exists: true,
      data: () => ({
        ownerId: "owner_uid_123",
        groupName: "Apex Corp",
        workplaceCode: "EZM-APEX-123456",
        joinKey: "WPK-OLDD-0000",
      }),
    };

    mockMethods.get.mockResolvedValue(mockGroupDoc);
    mockMethods.update.mockResolvedValue(true);
    mockMethods.doc.mockReturnValue({
      get: mockMethods.get,
      update: mockMethods.update,
    });
    mockMethods.collection.mockReturnValue({doc: mockMethods.doc});

    const result = await handleRotateWorkplaceCredentials(
      {groupId: "group_123"},
      "owner_uid_123"
    );

    expect(result.success).toBe(true);
    expect(result.workplaceCode).toBe("EZM-APEX-123456");
    expect(result.joinKey).toMatch(/^WPK-[A-F0-9]{4}-[A-F0-9]{4}$/);
    expect(result.joinKey).not.toBe("WPK-OLDD-0000");

    expect(mockMethods.update).toHaveBeenCalledTimes(1);
    const updateData = mockMethods.update.mock.calls[0][0];
    expect(updateData.joinKey).toBe(result.joinKey);
    expect(updateData.password).toMatch(/^\$scrypt\$/);
  });

  it("should reject rotation if caller is not the owner", async () => {
    const mockGroupDoc = {
      exists: true,
      data: () => ({
        ownerId: "owner_uid_123",
      }),
    };

    mockMethods.get.mockResolvedValue(mockGroupDoc);
    mockMethods.doc.mockReturnValue({
      get: mockMethods.get,
      update: mockMethods.update,
    });
    mockMethods.collection.mockReturnValue({doc: mockMethods.doc});

    await expect(
      handleRotateWorkplaceCredentials({groupId: "group_123"}, "imposter_uid")
    ).rejects.toThrow(HttpsError);
  });
});

describe("handleUpdateCompanyShiftGroup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update company name and operational toggles when caller is owner", async () => {
    const mockGroupDoc = {
      exists: true,
      data: () => ({
        ownerId: "owner_123",
        groupName: "Old Corp Name",
      }),
    };

    mockMethods.get.mockResolvedValue(mockGroupDoc);
    mockMethods.update.mockResolvedValue(true);
    mockMethods.doc.mockReturnValue({
      get: mockMethods.get,
      update: mockMethods.update,
    });
    mockMethods.collection.mockReturnValue({doc: mockMethods.doc});

    const result = await handleUpdateCompanyShiftGroup(
      {
        groupId: "CORP-TEST1234",
        groupName: "Apex Global Holdings",
        multiStoreEnabled: false,
        aiEnabled: true,
        workersCount: "51-200",
        requireApproval: true,
      },
      "owner_123"
    );

    expect(result.success).toBe(true);
    expect(mockMethods.update).toHaveBeenCalledTimes(1);
    const updateData = mockMethods.update.mock.calls[0][0];
    expect(updateData.groupName).toBe("Apex Global Holdings");
    expect(updateData.multiStoreEnabled).toBe(false);
    expect(updateData.aiEnabled).toBe(true);
    expect(updateData.workersCount).toBe("51-200");
    expect(updateData.requireApproval).toBe(true);
  });

  it("should securely hash and rotate join password when newPassword is provided", async () => {
    const mockGroupDoc = {
      exists: true,
      data: () => ({
        ownerId: "owner_123",
      }),
    };

    mockMethods.get.mockResolvedValue(mockGroupDoc);
    mockMethods.update.mockResolvedValue(true);
    mockMethods.doc.mockReturnValue({
      get: mockMethods.get,
      update: mockMethods.update,
    });
    mockMethods.collection.mockReturnValue({doc: mockMethods.doc});

    const result = await handleUpdateCompanyShiftGroup(
      {
        groupId: "CORP-TEST1234",
        newPassword: "BrandNewSecurePassword123",
      },
      "owner_123"
    );

    expect(result.success).toBe(true);
    const updateData = mockMethods.update.mock.calls[0][0];
    expect(updateData.joinKey).toBe("BrandNewSecurePassword123");
    expect(updateData.password).toMatch(/^\$scrypt\$[a-f0-9]+:[a-f0-9]+$/);

    const [hash, salt] = updateData.password.substring(8).split(":");
    const derived = crypto.scryptSync("BrandNewSecurePassword123", salt, 64).toString("hex");
    expect(derived).toBe(hash);
  });

  it("should reject updates if caller is not the owner", async () => {
    const mockGroupDoc = {
      exists: true,
      data: () => ({
        ownerId: "owner_123",
      }),
    };

    mockMethods.get.mockResolvedValue(mockGroupDoc);
    mockMethods.doc.mockReturnValue({
      get: mockMethods.get,
      update: mockMethods.update,
    });
    mockMethods.collection.mockReturnValue({doc: mockMethods.doc});

    await expect(
      handleUpdateCompanyShiftGroup({groupId: "CORP-TEST1234", groupName: "Hacked"}, "imposter_uid")
    ).rejects.toThrow(HttpsError);
  });
});

describe("handleUpdateProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update user profile details atomically", async () => {
    mockMethods.set.mockResolvedValue(true);
    mockMethods.doc.mockReturnValue({set: mockMethods.set});
    mockMethods.collection.mockReturnValue({doc: mockMethods.doc});

    const result = await handleUpdateProfile(
      {
        name: "Jane Doe",
        jobTitle: "VP Operations",
        defaultTab: "managers",
      },
      "user_123"
    );

    expect(result.success).toBe(true);
    expect(mockMethods.doc).toHaveBeenCalledWith("user_123");
    expect(mockMethods.set).toHaveBeenCalledWith({
      name: "Jane Doe",
      jobTitle: "VP Operations",
      defaultTab: "managers",
      updatedAt: "MOCK_TIMESTAMP",
    }, {merge: true});
  });
});

describe("handleAddManagerShiftGroup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should link existing user to group as Manager", async () => {
    const mockGroupDoc = {
      exists: true,
      data: () => ({
        ownerId: "owner_123",
      }),
    };

    const mockUserDoc = {
      id: "manager_uid_456",
      data: () => ({
        email: "storemanager@example.com",
      }),
    };

    mockMethods.get.mockImplementation(function() {
      return Promise.resolve(mockGroupDoc);
    });
    const whereGetter = jest.fn().mockResolvedValue({
      empty: false,
      docs: [mockUserDoc],
    });
    mockMethods.limit.mockReturnValue({get: whereGetter});
    mockMethods.where.mockReturnValue({limit: mockMethods.limit});
    mockMethods.set.mockResolvedValue(true);

    mockMethods.doc.mockImplementation((id) => {
      if (id === "CORP-123") return {get: () => Promise.resolve(mockGroupDoc)};
      return {set: mockMethods.set, get: () => Promise.resolve(mockUserDoc)};
    });

    mockMethods.collection.mockImplementation((col) => {
      if (col === "shift_groups") return {doc: mockMethods.doc};
      if (col === "users") return {where: mockMethods.where, doc: mockMethods.doc};
      return mockMethods;
    });

    const result = await handleAddManagerShiftGroup(
      {
        groupId: "CORP-123",
        email: "storemanager@example.com",
      },
      "owner_123"
    );

    expect(result.success).toBe(true);
    expect(result.managerId).toBe("manager_uid_456");
    expect(mockMethods.set).toHaveBeenCalledWith(expect.objectContaining({
      orgId: "CORP-123",
      role: "Manager",
    }), {merge: true});
  });
});

describe("handleGetAdminCompanies & Multi-Store Resolution", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should resolve admin companies owned by user and set activeCompany", async () => {
    const mockUserDoc = {
      exists: true,
      data: () => ({
        email: "executive@apex.com",
        role: "CorporateAdmin",
      }),
    };

    const mockCompanyDoc = {
      id: "CORP-APEX001",
      exists: true,
      data: () => ({
        groupName: "Apex Hospitality Group",
        workplaceCode: "EZM-APEX-112233",
        joinKey: "WPK-1111-2222",
        ownerId: "admin_uid_1",
        ownerEmail: "executive@apex.com",
        multiStoreEnabled: true,
      }),
    };

    const whereSnap = {
      empty: false,
      forEach: (cb) => cb(mockCompanyDoc),
    };

    mockMethods.doc.mockImplementation((id) => {
      if (id === "admin_uid_1") return {get: () => Promise.resolve(mockUserDoc), set: mockMethods.set};
      if (id === "CORP-APEX001") return {get: () => Promise.resolve(mockCompanyDoc)};
      return {get: () => Promise.resolve({exists: false})};
    });

    mockMethods.where.mockReturnValue({
      get: jest.fn().mockResolvedValue(whereSnap),
    });

    mockMethods.collection.mockImplementation((col) => {
      if (col === "users") return {doc: mockMethods.doc};
      if (col === "shift_groups") return {doc: mockMethods.doc, where: mockMethods.where};
      return mockMethods;
    });

    const result = await handleGetAdminCompanies(
      {},
      "admin_uid_1",
      {auth: {token: {email: "executive@apex.com"}}},
      false,
      null
    );

    expect(result.success).toBe(true);
    expect(result.companies.length).toBe(1);
    expect(result.companies[0].id).toBe("CORP-APEX001");
    expect(result.companies[0].groupName).toBe("Apex Hospitality Group");
    expect(result.companies[0].workplaceCode).toBe("EZM-APEX-112233");
    expect(result.activeCompany.id).toBe("CORP-APEX001");
    // Auto-heals user document with orgId
    expect(mockMethods.set).toHaveBeenCalledWith(expect.objectContaining({
      orgId: "CORP-APEX001",
      role: "CorporateAdmin",
    }), {merge: true});
  });

  it("should resolve company via assigned userOrgId even if user is not the ownerId", async () => {
    const mockUserDoc = {
      exists: true,
      data: () => ({
        email: "regional_admin@apex.com",
        role: "CorporateAdmin",
        orgId: "CORP-APEX001",
      }),
    };

    const mockCompanyDoc = {
      id: "CORP-APEX001",
      exists: true,
      data: () => ({
        groupName: "Apex Hospitality Group",
        workplaceCode: "EZM-APEX-112233",
        ownerId: "different_creator_uid",
      }),
    };

    mockMethods.doc.mockImplementation((id) => {
      if (id === "regional_uid_2") return {get: () => Promise.resolve(mockUserDoc), set: mockMethods.set};
      if (id === "CORP-APEX001") return {get: () => Promise.resolve(mockCompanyDoc)};
      return {get: () => Promise.resolve({exists: false})};
    });

    mockMethods.where.mockReturnValue({
      get: jest.fn().mockResolvedValue({empty: true, forEach: () => {}}),
    });

    mockMethods.collection.mockImplementation((col) => {
      if (col === "users") return {doc: mockMethods.doc};
      if (col === "shift_groups") return {doc: mockMethods.doc, where: mockMethods.where};
      return mockMethods;
    });

    const result = await handleGetAdminCompanies(
      {},
      "regional_uid_2",
      {auth: {token: {email: "regional_admin@apex.com"}}},
      false,
      "CORP-APEX001"
    );

    expect(result.success).toBe(true);
    expect(result.companies.length).toBe(1);
    expect(result.activeCompany.id).toBe("CORP-APEX001");
    expect(result.activeCompany.groupName).toBe("Apex Hospitality Group");
  });

  it("should handle multi-store admins with multiple companies and respect preferredOrgId", async () => {
    const mockUserDoc = {
      exists: true,
      data: () => ({
        email: "multi_owner@apex.com",
        role: "CorporateAdmin",
      }),
    };

    const mockCompanyA = {
      id: "CORP-STORE-A",
      exists: true,
      data: () => ({
        groupName: "Apex Downtown Store",
        workplaceCode: "EZM-APEX-0001",
        ownerId: "multi_uid_3",
      }),
    };

    const mockCompanyB = {
      id: "CORP-STORE-B",
      exists: true,
      data: () => ({
        groupName: "Apex Uptown Store",
        workplaceCode: "EZM-APEX-0002",
        ownerId: "multi_uid_3",
      }),
    };

    mockMethods.doc.mockImplementation((id) => {
      if (id === "multi_uid_3") return {get: () => Promise.resolve(mockUserDoc), set: mockMethods.set};
      if (id === "CORP-STORE-A") return {get: () => Promise.resolve(mockCompanyA)};
      if (id === "CORP-STORE-B") return {get: () => Promise.resolve(mockCompanyB)};
      return {get: () => Promise.resolve({exists: false})};
    });

    mockMethods.where.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        empty: false,
        forEach: (cb) => {
          cb(mockCompanyA);
          cb(mockCompanyB);
        },
      }),
    });

    mockMethods.collection.mockImplementation((col) => {
      if (col === "users") return {doc: mockMethods.doc};
      if (col === "shift_groups") return {doc: mockMethods.doc, where: mockMethods.where};
      return mockMethods;
    });

    const result = await handleGetAdminCompanies(
      {preferredOrgId: "CORP-STORE-B"},
      "multi_uid_3",
      {auth: {token: {email: "multi_owner@apex.com"}}},
      false,
      null
    );

    expect(result.success).toBe(true);
    expect(result.companies.length).toBe(2);
    // Active company should be preferred store B
    expect(result.activeCompany.id).toBe("CORP-STORE-B");
    expect(result.activeCompany.groupName).toBe("Apex Uptown Store");
  });
});

describe("handleSwitchCompany", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should switch company and update user document atomically", async () => {
    const mockUserDoc = {
      exists: true,
      data: () => ({
        email: "owner@company.com",
        role: "CorporateAdmin",
      }),
    };

    const mockTargetDoc = {
      id: "CORP-STORE-TARGET",
      exists: true,
      data: () => ({
        groupName: "Target Store Location",
        workplaceCode: "EZM-TGT-9999",
        ownerId: "owner_uid_4",
      }),
    };

    mockMethods.doc.mockImplementation((id) => {
      if (id === "owner_uid_4") return {get: () => Promise.resolve(mockUserDoc), set: mockMethods.set};
      if (id === "CORP-STORE-TARGET") return {get: () => Promise.resolve(mockTargetDoc)};
      return {get: () => Promise.resolve({exists: false})};
    });

    mockMethods.collection.mockImplementation((col) => {
      if (col === "users") return {doc: mockMethods.doc};
      if (col === "shift_groups") return {doc: mockMethods.doc};
      return mockMethods;
    });

    const result = await handleSwitchCompany(
      {groupId: "CORP-STORE-TARGET"},
      "owner_uid_4",
      {auth: {token: {email: "owner@company.com"}}},
      false,
      null
    );

    expect(result.success).toBe(true);
    expect(result.groupId).toBe("CORP-STORE-TARGET");
    expect(result.activeCompany.groupName).toBe("Target Store Location");
    expect(mockMethods.set).toHaveBeenCalledWith(expect.objectContaining({
      orgId: "CORP-STORE-TARGET",
      role: "CorporateAdmin",
    }), {merge: true});
  });

  it("should reject switch if user has no authorization to target company", async () => {
    const mockUserDoc = {
      exists: true,
      data: () => ({
        email: "stranger@other.com",
        role: "User",
        orgId: "OTHER-ORG",
      }),
    };

    const mockTargetDoc = {
      id: "CORP-PRIVATE",
      exists: true,
      data: () => ({
        groupName: "Private Enterprise",
        ownerId: "someone_else",
      }),
    };

    mockMethods.doc.mockImplementation((id) => {
      if (id === "stranger_uid") return {get: () => Promise.resolve(mockUserDoc)};
      if (id === "CORP-PRIVATE") return {get: () => Promise.resolve(mockTargetDoc)};
      return {get: () => Promise.resolve({exists: false})};
    });

    mockMethods.collection.mockImplementation((col) => {
      if (col === "users") return {doc: mockMethods.doc};
      if (col === "shift_groups") return {doc: mockMethods.doc};
      return mockMethods;
    });

    await expect(
      handleSwitchCompany(
        {groupId: "CORP-PRIVATE"},
        "stranger_uid",
        {auth: {token: {email: "stranger@other.com"}}},
        false,
        "OTHER-ORG"
      )
    ).rejects.toThrow(HttpsError);
  });
});
