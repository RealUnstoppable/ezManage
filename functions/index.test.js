const admin = require("firebase-admin");
const functionsTest = require("firebase-functions-test")();

// Mock dependencies
jest.mock("firebase-admin", () => {
  const firestoreMock = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    set: jest.fn(),
    where: jest.fn().mockReturnThis(),
    get: jest.fn(),
    update: jest.fn(),
  };
  return {
    initializeApp: jest.fn(),
    firestore: jest.fn(() => firestoreMock),
  };
});
admin.firestore.FieldValue = {
  serverTimestamp: jest.fn(),
};

// We must mock Stripe properly since it's instantiated immediately when index.js is required.
const mockStripeMock = {
  webhooks: {
    constructEvent: jest.fn(),
  },
  checkout: {
    sessions: {
      create: jest.fn(),
    },
  },
  subscriptions: {
    list: jest.fn(),
    cancel: jest.fn(),
  },
};

jest.mock("stripe", () => {
  return jest.fn(() => mockStripeMock);
});

// Import the module after mocking
const {stripeWebhook, createCheckoutSession} = require("./index.js");

describe("createCheckoutSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    functionsTest.cleanup();
  });

  it("should return 500 when checkout session creation fails", async () => {
    const req = {
      method: "POST",
      body: {
        uid: "test_uid",
        email: "test@example.com",
        plan: "Business Pro",
        amount: 100,
      },
      headers: {origin: true},
      get: jest.fn(),
    };

    const res = {
      setHeader: jest.fn(),
      getHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };

    const errorMessage = "Stripe API error";
    mockStripeMock.checkout.sessions.create.mockRejectedValue(new Error(errorMessage));

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Since createCheckoutSession uses cors, the logic is executed asynchronously
    // We will call the function, wait a bit, then assert
    createCheckoutSession(req, res);

    // Use a short delay to allow the async operations to finish
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockStripeMock.checkout.sessions.create).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith("Checkout Error:", expect.any(Error));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({error: errorMessage});

    consoleSpy.mockRestore();
  });
});

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

  afterAll(() => {
    functionsTest.cleanup();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return 400 when constructEvent throws an error", async () => {
    mockStripeMock.webhooks.constructEvent.mockImplementation(() => {
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

    mockStripeMock.webhooks.constructEvent.mockReturnValue(mockEvent);

    await stripeWebhook(req, res);

    expect(res.json).toHaveBeenCalledWith({received: true});

    const firestoreMock = admin.firestore();
    expect(firestoreMock.collection).toHaveBeenCalledWith("users");
    expect(firestoreMock.doc).toHaveBeenCalledWith("user_123");
    expect(firestoreMock.set).toHaveBeenCalledWith({
      plan: "Business Pro",
      subscription: {
        status: "active",
        customerId: "cus_123",
        subscriptionId: "sub_123",
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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

    mockStripeMock.webhooks.constructEvent.mockReturnValue(mockEvent);

    await stripeWebhook(req, res);

    expect(res.json).toHaveBeenCalledWith({received: true});

    const firestoreMock = admin.firestore();
    expect(firestoreMock.set).not.toHaveBeenCalled();
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

    mockStripeMock.webhooks.constructEvent.mockReturnValue(mockEvent);

    const mockUpdate = jest.fn();
    const mockDocs = [
      {id: "user_1", ref: {update: mockUpdate}},
      {id: "user_2", ref: {update: mockUpdate}},
    ];

    const firestoreMock = admin.firestore();
    firestoreMock.get.mockResolvedValue(mockDocs);

    await stripeWebhook(req, res);

    expect(res.json).toHaveBeenCalledWith({received: true});

    expect(firestoreMock.where).toHaveBeenCalledWith("subscription.customerId", "==", "cus_123");
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockUpdate).toHaveBeenCalledWith({
      "plan": "Free",
      "subscription.status": "canceled",
      "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
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

    mockStripeMock.webhooks.constructEvent.mockReturnValue(mockEvent);

    const mockUpdate = jest.fn();
    const mockDocs = [
      {id: "user_3", ref: {update: mockUpdate}},
    ];

    const firestoreMock = admin.firestore();
    firestoreMock.get.mockResolvedValue(mockDocs);

    await stripeWebhook(req, res);

    expect(res.json).toHaveBeenCalledWith({received: true});

    expect(firestoreMock.where).toHaveBeenCalledWith("subscription.customerId", "==", "cus_456");
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith({
      "plan": "Free",
      "subscription.status": "canceled",
      "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  it("should ignore unhandled event types", async () => {
    const mockEvent = {
      type: "some.other.event",
      data: {
        object: {},
      },
    };

    mockStripeMock.webhooks.constructEvent.mockReturnValue(mockEvent);

    await stripeWebhook(req, res);

    expect(res.json).toHaveBeenCalledWith({received: true});

    const firestoreMock = admin.firestore();
    expect(firestoreMock.set).not.toHaveBeenCalled();
    expect(firestoreMock.update).not.toHaveBeenCalled();
  });
});
