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
  generateUniqueWorkplaceCode,
  generateUniqueWorkplaceKey,
} = require("../index");
const {HttpsError} = require("firebase-functions/v1/https");

describe("Workplace Credentials Helpers", () => {
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
});

describe("handleCreateShiftGroup with Workplace Credentials", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMethods.add.mockResolvedValue({id: "new_group_123"});
    mockMethods.set.mockResolvedValue(true);
    mockMethods.doc.mockReturnValue({set: mockMethods.set});
    mockMethods.collection.mockImplementation((name) => {
      if (name === "shift_groups") return {add: mockMethods.add};
      if (name === "users") return {doc: mockMethods.doc};
      return mockMethods;
    });
  });

  it("should create shift group with auto-generated unique workplace credentials", async () => {
    const payload = {
      groupName: "Starbucks Store #402",
      ownerName: "Manager Dave",
    };

    const result = await handleCreateShiftGroup(payload, "user_owner_1");

    expect(result.success).toBe(true);
    expect(result.groupId).toBe("new_group_123");
    expect(result.workplaceCode).toMatch(/^EZM-STAR-[A-F0-9]{6}$/);
    expect(result.joinKey).toMatch(/^WPK-[A-F0-9]{4}-[A-F0-9]{4}$/);

    expect(mockMethods.add).toHaveBeenCalledTimes(1);
    const savedGroup = mockMethods.add.mock.calls[0][0];
    expect(savedGroup.groupName).toBe("Starbucks Store #402");
    expect(savedGroup.workplaceCode).toBe(result.workplaceCode);
    expect(savedGroup.joinKey).toBe(result.joinKey);
    // Password must be hashed with scrypt
    expect(savedGroup.password).toMatch(/^\$scrypt\$[a-f0-9]+:[a-f0-9]+$/);

    // Verify hash can be authenticated with scrypt
    const [hash, salt] = savedGroup.password.substring(8).split(":");
    const derived = crypto.scryptSync(result.joinKey, salt, 64).toString("hex");
    expect(derived).toBe(hash);

    // User doc updated
    expect(mockMethods.collection).toHaveBeenCalledWith("users");
    expect(mockMethods.doc).toHaveBeenCalledWith("user_owner_1");
    expect(mockMethods.set).toHaveBeenCalledWith({orgId: "new_group_123"}, {merge: true});
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

    const savedGroup = mockMethods.add.mock.calls[0][0];
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
