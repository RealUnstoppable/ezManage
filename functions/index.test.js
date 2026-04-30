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

  it("should return 405 if method is not POST", async () => {
    const req = {
      method: "GET",
      headers: {origin: true},
      get: jest.fn(),
    };

    const res = {
      setHeader: jest.fn(),
      getHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    // cors is used asynchronously, wait for it using a promise
    await new Promise((resolve) => {
      res.send.mockImplementation(() => resolve());
      createCheckoutSession(req, res);
    });

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.send).toHaveBeenCalledWith("Method Not Allowed");
  });

  it("should create session successfully with custom amount", async () => {
    const req = {
      method: "POST",
      body: {
        uid: "test_uid",
        email: "test@example.com",
        plan: "Business Pro",
        amount: 150,
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

    mockStripeMock.checkout.sessions.create.mockResolvedValue({url: "https://checkout.url"});

    await new Promise((resolve) => {
      res.json.mockImplementation(() => resolve());
      createCheckoutSession(req, res);
    });

    expect(mockStripeMock.checkout.sessions.create).toHaveBeenCalledWith({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: "test@example.com",
      line_items: [{
        price_data: {
          currency: "usd",
          product: "prod_UFnBrTwFCgb54A",
          recurring: {interval: "year"},
          unit_amount: 15000,
        },
        quantity: 1,
      }],
      subscription_data: {trial_period_days: 7},
      success_url: "https://dreamstimeskip-beta.pages.dev/tracker?success=true",
      cancel_url: "https://dreamstimeskip-beta.pages.dev/tracker?canceled=true",
      metadata: {
        uid: "test_uid",
        planName: "Business Pro",
      },
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({url: "https://checkout.url"});
  });

  it("should create session successfully with default price ID when no amount is provided", async () => {
    const req = {
      method: "POST",
      body: {
        uid: "test_uid",
        email: "test2@example.com",
        plan: "Pro",
        successUrl: "https://custom.success",
        cancelUrl: "https://custom.cancel",
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

    mockStripeMock.checkout.sessions.create.mockResolvedValue({url: "https://checkout.url"});

    await new Promise((resolve) => {
      res.json.mockImplementation(() => resolve());
      createCheckoutSession(req, res);
    });

    expect(mockStripeMock.checkout.sessions.create).toHaveBeenCalledWith({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: "test2@example.com",
      line_items: [{price: "price_1THHYPBp2C5GdKaKxNpqndNE", quantity: 1}],
      subscription_data: {trial_period_days: 7},
      success_url: "https://custom.success",
      cancel_url: "https://custom.cancel",
      metadata: {
        uid: "test_uid",
        planName: "Pro",
      },
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({url: "https://checkout.url"});
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

    await new Promise((resolve) => {
      res.json.mockImplementation(() => resolve());
      createCheckoutSession(req, res);
    });

    expect(mockStripeMock.checkout.sessions.create).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith("Checkout Error:", expect.any(Error));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({error: errorMessage});

    consoleSpy.mockRestore();
  });
});

describe("stripeWebhook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    functionsTest.cleanup();
  });

  it("should return 400 when constructEvent throws an error", async () => {
    const req = {
      headers: {
        "stripe-signature": "invalid_signature",
      },
      rawBody: "raw_body_data",
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };

    // Simulate an error from stripe.webhooks.constructEvent
    const errorMessage = "Invalid signature";
    mockStripeMock.webhooks.constructEvent.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    // Suppress console.error in tests to avoid noisy output
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Call the webhook
    await stripeWebhook(req, res);

    // Assertions
    expect(mockStripeMock.webhooks.constructEvent).toHaveBeenCalledWith("raw_body_data", "invalid_signature", expect.any(String));
    expect(consoleSpy).toHaveBeenCalledWith("Webhook Error:", expect.any(Error));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(`Webhook Error: ${errorMessage}`);

    consoleSpy.mockRestore();
  });
});
