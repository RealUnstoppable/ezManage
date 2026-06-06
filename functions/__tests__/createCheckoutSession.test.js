const mockCreateSession = jest.fn();

jest.mock("firebase-admin", () => {
  const firestoreMock = {
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
    checkout: {
      sessions: {
        create: mockCreateSession,
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

const {createCheckoutSession} = require("../index.js");

describe("createCheckoutSession", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      method: "POST",
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };
  });

  it("should return 405 if method is not POST", async () => {
    req.method = "GET";
    await createCheckoutSession(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.send).toHaveBeenCalledWith("Method Not Allowed");
  });

  it("should call stripe.checkout.sessions.create and return url", async () => {
    req.body = {
      uid: "test-uid",
      email: "test@example.com",
      plan: "Business Pro",
      successUrl: "http://success.com",
      cancelUrl: "http://cancel.com",
    };

    mockCreateSession.mockResolvedValueOnce({url: "http://stripe.checkout.url"});

    await createCheckoutSession(req, res);

    expect(mockCreateSession).toHaveBeenCalled();
    const createArgs = mockCreateSession.mock.calls[0][0];
    expect(createArgs.customer_email).toBe("test@example.com");
    expect(createArgs.success_url).toBe("http://success.com");
    expect(createArgs.cancel_url).toBe("http://cancel.com");
    expect(createArgs.metadata.uid).toBe("test-uid");
    expect(createArgs.metadata.planName).toBe("Business Pro");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({url: "http://stripe.checkout.url"});
  });

  it("should handle custom amount", async () => {
    req.body = {
      uid: "test-uid",
      email: "test@example.com",
      plan: "Business Pro",
      amount: 50, // Should be ignored by backend
    };

    // We mock firestore to return a user doc with a promo code
    const mockFirestore = require("firebase-admin").firestore;
    mockFirestore().collection().doc().get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ hasPromoCode: true })
    });

    mockCreateSession.mockResolvedValueOnce({url: "http://stripe.checkout.url"});

    await createCheckoutSession(req, res);

    expect(mockCreateSession).toHaveBeenCalled();
    const createArgs = mockCreateSession.mock.calls[0][0];
    expect(createArgs.line_items).toEqual([
      {
        price_data: {
          currency: "usd",
          product: "prod_UFnBrTwFCgb54A",
          recurring: {interval: "year"},
          unit_amount: 18600, // 207 * 0.9 = 186.3 -> floored to 186 -> * 100 = 18600
        },
        quantity: 1,
      },
    ]);
  });

  it("should handle error from stripe", async () => {
    req.body = {
      email: "test@example.com",
    };
    const error = new Error("Stripe Error");
    mockCreateSession.mockRejectedValueOnce(error);

    await createCheckoutSession(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({error: "Stripe Error"});
  });
});
