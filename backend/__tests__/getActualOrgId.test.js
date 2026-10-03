const {getActualOrgId} = require("../index");
const {HttpsError} = require("firebase-functions/v1/https");
const {handleInternalError} = require("../utils");

jest.mock("../utils", () => {
  const {HttpsError} = require("firebase-functions/v1/https");
  return {
    handleInternalError: jest.fn((msg, err) => {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", "An internal error occurred.");
    }),
    adaptGen2Params: jest.fn(),
    logManagerError: jest.fn(),
    checkRequiredFields: jest.fn(),
  };
});

const mockDoc = jest.fn();
const mockCollection = jest.fn(() => ({doc: mockDoc}));
const mockFirestore = jest.fn(() => ({collection: mockCollection}));

const mockAdmin = {
  firestore: mockFirestore,
  initializeApp: jest.fn(),
};

describe("getActualOrgId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the user orgId if the user exists and has an orgId", async () => {
    mockDoc.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({orgId: "org123"}),
      }),
    });

    const result = await getActualOrgId(mockAdmin, "uid123");
    expect(result).toBe("org123");
    expect(mockFirestore).toHaveBeenCalled();
    expect(mockCollection).toHaveBeenCalledWith("users");
    expect(mockDoc).toHaveBeenCalledWith("uid123");
  });

  it("should return null if the user exists but has no orgId", async () => {
    mockDoc.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({}),
      }),
    });

    const result = await getActualOrgId(mockAdmin, "uid123");
    expect(result).toBeNull();
  });

  it("should throw a not-found HttpsError if the user does not exist", async () => {
    mockDoc.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        exists: false,
      }),
    });

    await expect(getActualOrgId(mockAdmin, "uid123")).rejects.toThrow(HttpsError);
    await expect(getActualOrgId(mockAdmin, "uid123")).rejects.toThrow("User not found");
  });

  it("should handle unexpected errors by throwing an internal HttpsError", async () => {
    mockDoc.mockReturnValue({
      get: jest.fn().mockRejectedValue(new Error("Database connection failed")),
    });

    await expect(getActualOrgId(mockAdmin, "uid123")).rejects.toThrow(HttpsError);
    await expect(getActualOrgId(mockAdmin, "uid123")).rejects.toThrow("An internal error occurred.");
    expect(handleInternalError).toHaveBeenCalled();
  });
});
