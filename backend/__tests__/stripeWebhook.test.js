const mockConstructEvent = jest.fn();

const mockProcessedEventsDoc = {
  get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
  set: jest.fn().mockResolvedValue({}),
};

const mockFirestore = {
  initializeApp: jest.fn(),
  collection: jest.fn((name) => {
    if (name === "processed_stripe_events") {
      return {
        doc: jest.fn(() => mockProcessedEventsDoc),
      };
    }
    return mockFirestore;
  }),
  doc: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  get: jest.fn(),
  set: jest.fn().mockResolvedValue({}),
  batch: jest.fn(),
};

jest.mock("firebase-admin", () => {
  return {
    initializeApp: jest.fn(),
    firestore: Object.assign(jest.fn(() => mockFirestore), {
      FieldValue: { serverTimestamp: jest.fn(() => "MOCK_TIMESTAMP") },
    }),
  };
});

jest.mock("stripe", () => {
  const StripeMock = jest.fn(() => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  }));
  StripeMock.webhooks = {
    constructEvent: mockConstructEvent,
  };
  return StripeMock;
});

jest.mock("../utils.js", () => {
  const actual = jest.requireActual("../utils.js");
  return {
    ...actual,
    logManagerError: jest.fn(),
  };
});

const { stripeWebhook } = require("../index.js");

describe("Stripe Webhook Processing & Security", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret_12345";
    req = {
      headers: {
        "stripe-signature": "test_sig_abc",
      },
      rawBody: Buffer.from(JSON.stringify({ id: "evt_123" })),
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  it("should return 400 if stripe-signature header is missing", async () => {
    req.headers = {};
    await stripeWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Webhook Error: Missing stripe-signature header");
  });

  it("should return 400 if rawBody is missing", async () => {
    req.rawBody = null;
    await stripeWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Webhook Error: Missing raw request body");
  });

  it("should return 500 if STRIPE_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    await stripeWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      "Webhook configuration error: STRIPE_WEBHOOK_SECRET is missing"
    );
  });

  it("should return 400 if signature verification fails", async () => {
    mockConstructEvent.mockImplementationOnce(() => {
      throw new Error("Invalid signature");
    });
    await stripeWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Webhook Error: Invalid signature");
  });

  describe("Webhook Idempotency & Deduplication", () => {
    it("should skip duplicate events if event.id was already processed in Firestore", async () => {
      const duplicateEvent = {
        id: "evt_duplicate_999",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            client_reference_id: "user_pro_999",
          },
        },
      };
      mockConstructEvent.mockReturnValueOnce(duplicateEvent);
      mockProcessedEventsDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ type: "checkout.session.completed" }),
      });

      await stripeWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true, duplicate: true });
      expect(mockFirestore.doc).not.toHaveBeenCalledWith("user_pro_999");
    });

    it("should record event.id in processed_stripe_events on first arrival", async () => {
      const newEvent = {
        id: "evt_new_888",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            client_reference_id: "user_pro_999",
          },
        },
      };
      mockConstructEvent.mockReturnValueOnce(newEvent);
      mockProcessedEventsDoc.get.mockResolvedValueOnce({
        exists: false,
        data: () => ({}),
      });

      await stripeWebhook(req, res);

      expect(mockProcessedEventsDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "checkout.session.completed",
          processedAt: "MOCK_TIMESTAMP",
        })
      );
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  describe("Event: checkout.session.completed", () => {
    it("should upgrade user subscription when client_reference_id contains UID", async () => {
      const event = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            client_reference_id: "user_pro_999",
            customer: "cus_stripe_111",
            subscription: "sub_stripe_222",
            metadata: { planName: "Business Pro" },
          },
        },
      };
      mockConstructEvent.mockReturnValueOnce(event);

      await stripeWebhook(req, res);

      expect(mockFirestore.collection).toHaveBeenCalledWith("users");
      expect(mockFirestore.doc).toHaveBeenCalledWith("user_pro_999");
      expect(mockFirestore.set).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: "Business Pro",
          membershipLevel: "Business Pro",
          subscription: {
            status: "active",
            customerId: "cus_stripe_111",
            subscriptionId: "sub_stripe_222",
          },
        }),
        { merge: true }
      );
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it("should resolve UID by customer email if UID not in client_reference_id", async () => {
      const event = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            client_reference_id: null,
            customer_details: { email: "owner@company.com" },
            customer: "cus_abc",
            subscription: "sub_xyz",
            metadata: { planName: "Starter" },
          },
        },
      };
      mockConstructEvent.mockReturnValueOnce(event);

      mockFirestore.get.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: "resolved_user_456" }],
      });

      await stripeWebhook(req, res);

      expect(mockFirestore.collection).toHaveBeenCalledWith("users");
      expect(mockFirestore.where).toHaveBeenCalledWith("email", "==", "owner@company.com");
      expect(mockFirestore.doc).toHaveBeenCalledWith("resolved_user_456");
      expect(mockFirestore.set).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: "Starter",
          membershipLevel: "Starter",
        }),
        { merge: true }
      );
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  describe("Event: customer.subscription.deleted", () => {
    it("should downgrade users associated with the customer ID to Free plan", async () => {
      const event = {
        type: "customer.subscription.deleted",
        data: {
          object: {
            id: "sub_canceled_123",
            customer: "cus_canceling_456",
          },
        },
      };
      mockConstructEvent.mockReturnValueOnce(event);

      const mockBatchUpdate = jest.fn();
      const mockBatchCommit = jest.fn().mockResolvedValue({});
      mockFirestore.batch.mockReturnValueOnce({
        update: mockBatchUpdate,
        commit: mockBatchCommit,
      });

      mockFirestore.get.mockResolvedValueOnce({
        docs: [
          {
            id: "user_cancel_1",
            ref: "users/user_cancel_1",
          },
        ],
      });

      await stripeWebhook(req, res);

      expect(mockFirestore.collection).toHaveBeenCalledWith("users");
      expect(mockFirestore.where).toHaveBeenCalledWith(
        "subscription.customerId",
        "==",
        "cus_canceling_456"
      );
      expect(mockBatchUpdate).toHaveBeenCalledWith(
        "users/user_cancel_1",
        expect.objectContaining({
          plan: "Free",
          membershipLevel: "Free Tier",
          "subscription.status": "canceled",
        })
      );
      expect(mockBatchCommit).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  describe("Event: invoice.payment_succeeded", () => {
    it("should mark subscription status as active upon payment success", async () => {
      const event = {
        type: "invoice.payment_succeeded",
        data: {
          object: {
            id: "in_123",
            customer: "cus_paying_789",
            subscription: "sub_renewing_000",
          },
        },
      };
      mockConstructEvent.mockReturnValueOnce(event);

      const mockBatchUpdate = jest.fn();
      const mockBatchCommit = jest.fn().mockResolvedValue({});
      mockFirestore.batch.mockReturnValueOnce({
        update: mockBatchUpdate,
        commit: mockBatchCommit,
      });

      mockFirestore.get.mockResolvedValueOnce({
        docs: [
          {
            id: "user_active_1",
            ref: "users/user_active_1",
          },
        ],
      });

      await stripeWebhook(req, res);

      expect(mockBatchUpdate).toHaveBeenCalledWith(
        "users/user_active_1",
        expect.objectContaining({
          "subscription.status": "active",
        })
      );
      expect(mockBatchCommit).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });
});
