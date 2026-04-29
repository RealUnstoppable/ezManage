const admin = require("firebase-admin");

jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  firestore: () => ({
    collection: jest.fn(),
    FieldValue: { serverTimestamp: jest.fn() }
  })
}));

const mockSessionsCreate = jest.fn();
jest.mock("stripe", () => {
  return jest.fn(() => ({
    checkout: {
      sessions: {
        create: mockSessionsCreate
      }
    },
    webhooks: {
      constructEvent: jest.fn()
    },
    subscriptions: {
      list: jest.fn(),
      cancel: jest.fn()
    }
  }));
});

const myFunctions = require("./index.js");

describe("createCheckoutSession", () => {
  let req, res;

  beforeEach(() => {
    req = {
      method: "POST",
      headers: {
        origin: "http://localhost"
      },
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
      setHeader: jest.fn(), // for cors
      getHeader: jest.fn(),
    };
    mockSessionsCreate.mockClear();
  });

  it("should use Business Pro fallback price ID when amount is not provided", async () => {
    req.body = {
      uid: "123",
      email: "test@test.com",
      plan: "Business Pro"
    };

    mockSessionsCreate.mockResolvedValue({ url: "http://checkout.url" });

    await new Promise((resolve) => {
       res.json.mockImplementation((data) => resolve(data));
       res.send.mockImplementation((data) => resolve(data));
       myFunctions.createCheckoutSession(req, res);
    });

    expect(mockSessionsCreate).toHaveBeenCalledTimes(1);
    const createArgs = mockSessionsCreate.mock.calls[0][0];
    expect(createArgs.line_items).toEqual([
      { price: "price_1THHbVBp2C5GdKaKvCVoMf1X", quantity: 1 }
    ]);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ url: "http://checkout.url" });
  });

  it("should use default fallback price ID when plan is not Business Pro and amount is not provided", async () => {
    req.body = {
      uid: "123",
      email: "test@test.com",
      plan: "Pro"
    };

    mockSessionsCreate.mockResolvedValue({ url: "http://checkout.url" });

    await new Promise((resolve) => {
       res.json.mockImplementation((data) => resolve(data));
       res.send.mockImplementation((data) => resolve(data));
       myFunctions.createCheckoutSession(req, res);
    });

    expect(mockSessionsCreate).toHaveBeenCalledTimes(1);
    const createArgs = mockSessionsCreate.mock.calls[0][0];
    expect(createArgs.line_items).toEqual([
      { price: "price_1THHYPBp2C5GdKaKxNpqndNE", quantity: 1 }
    ]);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
