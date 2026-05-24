const mockListSubscriptions = jest.fn();
const mockCancelSubscription = jest.fn();

jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  firestore: () => ({}),
}));

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

describe("cancelSubscription", () => {
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
    await cancelSubscription(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.send).toHaveBeenCalledWith("Method Not Allowed");
  });

  it("should cancel all subscriptions for a customer and return success", async () => {
    req.body = {
      customerId: "cus_test_123",
    };

    mockListSubscriptions.mockResolvedValueOnce({
      data: [
        {id: "sub_1"},
        {id: "sub_2"},
      ],
    });

    mockCancelSubscription.mockResolvedValue({});

    await cancelSubscription(req, res);

    expect(mockListSubscriptions).toHaveBeenCalledWith({customer: "cus_test_123"});
    expect(mockCancelSubscription).toHaveBeenCalledTimes(2);
    expect(mockCancelSubscription).toHaveBeenCalledWith("sub_1");
    expect(mockCancelSubscription).toHaveBeenCalledWith("sub_2");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({success: true});
  });

  it("should handle error when listing subscriptions", async () => {
    req.body = {
      customerId: "cus_test_123",
    };

    const error = new Error("Stripe List Error");
    mockListSubscriptions.mockRejectedValueOnce(error);

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await cancelSubscription(req, res);

    expect(consoleSpy).toHaveBeenCalledWith("Manager Troubleshooting: Cancel Error for customerId: " + req.body.customerId, error);
    expect(consoleSpy).toHaveBeenCalledWith("Manager Troubleshooting: Cancel Error for customerId: cus_test_123", error);
    expect(consoleSpy).toHaveBeenCalledWith("Manager Troubleshooting: Cancel Error for customerId: cus_test_123", error);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({error: "Stripe List Error"});

    consoleSpy.mockRestore();
  });

  it("should handle error when cancelling a subscription", async () => {
    req.body = {
      customerId: "cus_test_123",
    };

    mockListSubscriptions.mockResolvedValueOnce({
      data: [
        {id: "sub_1"},
      ],
    });

    const error = new Error("Stripe Cancel Error");
    mockCancelSubscription.mockRejectedValueOnce(error);

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await cancelSubscription(req, res);

    expect(consoleSpy).toHaveBeenCalledWith("Manager Troubleshooting: Cancel Error for customerId: " + req.body.customerId, error);
    expect(consoleSpy).toHaveBeenCalledWith("Manager Troubleshooting: Cancel Error for customerId: cus_test_123", error);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({error: "Stripe Cancel Error"});

    consoleSpy.mockRestore();
  });
});
