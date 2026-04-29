const { cancelSubscription } = require("./index.js");

// Mock stripe
jest.mock("stripe", () => {
  const mockCancel = jest.fn();
  const mockList = jest.fn();
  const stripeMock = jest.fn(() => ({
    subscriptions: {
      list: mockList,
      cancel: mockCancel,
    },
  }));
  stripeMock.mockCancel = mockCancel;
  stripeMock.mockList = mockList;
  return stripeMock;
});

// Mock firebase-admin
jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  firestore: () => ({
    collection: () => ({
      doc: () => ({
        set: jest.fn(),
        update: jest.fn(),
      }),
      where: () => ({
        get: jest.fn().mockResolvedValue([]),
      }),
    }),
    FieldValue: {
      serverTimestamp: jest.fn(),
    },
  }),
}));

const stripe = require("stripe");

describe("cancelSubscription", () => {
  let req;
  let res;
  let mockList;
  let mockCancel;

  beforeEach(() => {
    jest.clearAllMocks();
    mockList = stripe.mockList;
    mockCancel = stripe.mockCancel;
    req = {
      method: "POST",
      headers: {
        origin: "http://localhost",
      },
      body: {
        customerId: "cus_123",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
      setHeader: jest.fn(),
      getHeader: jest.fn(),
    };
  });

  it("should return 405 Method Not Allowed for non-POST requests", async () => {
    req.method = "GET";

    // Call the exported function (which is an Express middleware-like function wrapped by cors)
    cancelSubscription(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.send).toHaveBeenCalledWith("Method Not Allowed");
  });

  it("should successfully cancel all subscriptions for a customer", async () => {
    mockList.mockResolvedValue({
      data: [{ id: "sub_1" }, { id: "sub_2" }],
    });
    mockCancel.mockResolvedValue({});

    // Await the function call, wrapping it in a Promise if necessary, but here the inner cors callback is async
    // Since cancelSubscription(req, res) might execute the cors callback synchronously, let's mock the res.json to resolve a promise
    await new Promise((resolve) => {
      res.json.mockImplementation(() => resolve());
      res.status.mockImplementation(() => res); // Allow chaining res.status().json()
      cancelSubscription(req, res);
    });

    expect(mockList).toHaveBeenCalledWith({ customer: "cus_123" });
    expect(mockCancel).toHaveBeenCalledTimes(2);
    expect(mockCancel).toHaveBeenCalledWith("sub_1");
    expect(mockCancel).toHaveBeenCalledWith("sub_2");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it("should return 500 and handle errors when Stripe API fails", async () => {
    const errorMsg = "Stripe API is down";
    mockList.mockRejectedValue(new Error(errorMsg));

    await new Promise((resolve) => {
      res.json.mockImplementation(() => resolve());
      res.status.mockImplementation(() => res);
      cancelSubscription(req, res);
    });

    expect(mockList).toHaveBeenCalledWith({ customer: "cus_123" });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: errorMsg });
  });
});
