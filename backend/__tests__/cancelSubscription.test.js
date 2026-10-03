const mockListSubscriptions = jest.fn();
const mockCancelSubscription = jest.fn();

jest.mock("firebase-admin", () => {
  const firestoreMock = {
    initializeApp: jest.fn(),
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({email: "test@example.com"}),
      docs: [],
    }),
    update: jest.fn().mockResolvedValue({}),
    set: jest.fn().mockResolvedValue({}),
    add: jest.fn().mockResolvedValue({id: "docId123"}),
  };
  return {
    initializeApp: jest.fn(),
    firestore: Object.assign(jest.fn(() => firestoreMock), {FieldValue: {serverTimestamp: jest.fn()}}),
  };
});

jest.mock("stripe", () => {
  return jest.fn(() => ({
    subscriptions: {
      list: mockListSubscriptions,
      cancel: mockCancelSubscription,
    },
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
  }));
});

jest.mock("cors", () => {
  return jest.fn(() => {
    return (req, res, next) => {
      if (next) {
        return next();
      }
    };
  });
});

const {cancelSubscription} = require("../index.js");
const admin = require("firebase-admin");

describe("cancelSubscription", () => {
  let data;
  let context;

  beforeEach(() => {
    jest.clearAllMocks();
    data = {};
    context = {
      auth: {
        uid: "user_test_123",
      },
    };
  });

  it("should throw unauthenticated error if auth is missing", async () => {
    context.auth = null;
    await expect(cancelSubscription.run(data, context)).rejects.toThrow("You must be logged in.");
  });

  it("should throw not-found error if user document is missing", async () => {
    admin.firestore().get.mockResolvedValueOnce({exists: false});
    await expect(cancelSubscription.run(data, context)).rejects.toThrow("User not found");
  });

  it("should throw failed-precondition if customerId is missing from user document", async () => {
    admin.firestore().get.mockResolvedValueOnce({
      exists: true,
      data: () => ({subscription: {}}),
    });
    await expect(cancelSubscription.run(data, context)).rejects.toThrow("No active subscription found.");
  });

  it("should cancel all subscriptions for a customer and return success", async () => {
    admin.firestore().get.mockResolvedValueOnce({
      exists: true,
      data: () => ({subscription: {customerId: "cus_test_123"}}),
    });

    mockListSubscriptions.mockResolvedValueOnce({
      data: [
        {id: "sub_1"},
        {id: "sub_2"},
      ],
    });

    mockCancelSubscription.mockResolvedValue({});

    const result = await cancelSubscription.run(data, context);

    expect(mockListSubscriptions).toHaveBeenCalledWith({customer: "cus_test_123"});
    expect(mockCancelSubscription).toHaveBeenCalledTimes(2);
    expect(mockCancelSubscription).toHaveBeenCalledWith("sub_1");
    expect(mockCancelSubscription).toHaveBeenCalledWith("sub_2");

    expect(result).toEqual({success: true});
  });

  it("should handle error when listing subscriptions", async () => {
    admin.firestore().get.mockResolvedValueOnce({
      exists: true,
      data: () => ({subscription: {customerId: "cus_test_123"}}),
    });

    const error = new Error("Stripe List Error");
    mockListSubscriptions.mockRejectedValueOnce(error);

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(cancelSubscription.run(data, context)).rejects.toThrow("An internal server error occurred. Please try again later.");
    expect(consoleSpy).toHaveBeenCalledWith(`Manager Troubleshooting: Cancel Error for uid: user_test_123`, error);

    consoleSpy.mockRestore();
  });

  it("should handle error when cancelling a subscription", async () => {
    admin.firestore().get.mockResolvedValueOnce({
      exists: true,
      data: () => ({subscription: {customerId: "cus_test_123"}}),
    });

    mockListSubscriptions.mockResolvedValueOnce({
      data: [
        {id: "sub_1"},
      ],
    });

    const error = new Error("Stripe Cancel Error");
    mockCancelSubscription.mockRejectedValueOnce(error);

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(cancelSubscription.run(data, context)).rejects.toThrow("An internal server error occurred. Please try again later.");
    expect(consoleSpy).toHaveBeenCalledWith(`Manager Troubleshooting: Cancel Error for uid: user_test_123`, error);

    consoleSpy.mockRestore();
  });
});
