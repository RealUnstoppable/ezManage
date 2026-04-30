const admin = require("firebase-admin");

// 1. Mock firebase-admin before importing index.js
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockGet = jest.fn();
const mockWhere = jest.fn().mockReturnValue({get: mockGet});
const mockDoc = jest.fn().mockReturnValue({set: mockSet});
const mockCollection = jest.fn().mockReturnValue({
  doc: mockDoc,
  where: mockWhere,
});

jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  firestore: () => ({
    collection: mockCollection,
  }),
}));

admin.firestore.FieldValue = {
  serverTimestamp: jest.fn().mockReturnValue("mocked_timestamp"),
};

// 2. Mock Stripe before importing index.js
const mockConstructEvent = jest.fn();
jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  }));
});

// Since firebase-functions https.onRequest wraps Express middleware but doesn't easily play with supertest without full app initialization,
// we test the handler directly.
// The actual logic is inside an Express handler function returned by onRequest.
// Due to how firebase-functions v1 exports HTTP functions, we can access the handler.
jest.mock("firebase-functions", () => ({
  https: {
    onRequest: (handler) => handler,
  },
}));

const {stripeWebhook} = require("../index");

describe("stripeWebhook", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      headers: {
        "stripe-signature": "valid_sig",
      },
      rawBody: Buffer.from("raw body"),
    };

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };

    // Silence console logs/errors for cleaner test output
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return 400 when constructEvent throws an error", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    req.headers["stripe-signature"] = "invalid_sig";

    await stripeWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Webhook Error: Invalid signature");
  });

  it("should process checkout.session.completed with a valid UID", async () => {
    const mockEvent = {
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_123",
          subscription: "sub_123",
          metadata: {
            uid: "user_123",
            planName: "Business Pro",
          },
        },
      },
    };

    mockConstructEvent.mockReturnValue(mockEvent);

    await stripeWebhook(req, res);

    expect(res.json).toHaveBeenCalledWith({received: true});

    expect(mockCollection).toHaveBeenCalledWith("users");
    expect(mockDoc).toHaveBeenCalledWith("user_123");
    expect(mockSet).toHaveBeenCalledWith({
      plan: "Business Pro",
      subscription: {
        status: "active",
        customerId: "cus_123",
        subscriptionId: "sub_123",
      },
      updatedAt: "mocked_timestamp",
    }, {merge: true});
  });

  it("should ignore checkout.session.completed with missing or unknown UID", async () => {
    const mockEvent = {
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_123",
          subscription: "sub_123",
          metadata: {
            uid: "unknown",
          },
        },
      },
    };

    mockConstructEvent.mockReturnValue(mockEvent);

    await stripeWebhook(req, res);

    expect(res.json).toHaveBeenCalledWith({received: true});

    expect(mockSet).not.toHaveBeenCalled();
  });

  it("should process customer.subscription.deleted", async () => {
    const mockEvent = {
      type: "customer.subscription.deleted",
      data: {
        object: {
          customer: "cus_123",
        },
      },
    };

    mockConstructEvent.mockReturnValue(mockEvent);

    const mockDocs = [
      {id: "user_1", ref: {update: mockUpdate}},
      {id: "user_2", ref: {update: mockUpdate}},
    ];

    mockGet.mockResolvedValue(mockDocs);

    await stripeWebhook(req, res);

    expect(res.json).toHaveBeenCalledWith({received: true});

    expect(mockWhere).toHaveBeenCalledWith("subscription.customerId", "==", "cus_123");
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockUpdate).toHaveBeenCalledWith({
      "plan": "Free",
      "subscription.status": "canceled",
      "updatedAt": "mocked_timestamp",
    });
  });

  it("should process customer.subscription.canceled", async () => {
    const mockEvent = {
      type: "customer.subscription.canceled",
      data: {
        object: {
          customer: "cus_456",
        },
      },
    };

    mockConstructEvent.mockReturnValue(mockEvent);

    const mockDocs = [
      {id: "user_3", ref: {update: mockUpdate}},
    ];

    mockGet.mockResolvedValue(mockDocs);

    await stripeWebhook(req, res);

    expect(res.json).toHaveBeenCalledWith({received: true});

    expect(mockWhere).toHaveBeenCalledWith("subscription.customerId", "==", "cus_456");
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith({
      "plan": "Free",
      "subscription.status": "canceled",
      "updatedAt": "mocked_timestamp",
    });
  });

  it("should ignore unhandled event types", async () => {
    const mockEvent = {
      type: "some.other.event",
      data: {
        object: {},
      },
    };

    mockConstructEvent.mockReturnValue(mockEvent);

    await stripeWebhook(req, res);

    expect(res.json).toHaveBeenCalledWith({received: true});

    expect(mockSet).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
