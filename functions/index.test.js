const admin = require('firebase-admin');
const functionsTest = require('firebase-functions-test')();

// Mock dependencies
jest.mock('firebase-admin', () => {
  const firestoreMock = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    set: jest.fn(),
    where: jest.fn().mockReturnThis(),
    get: jest.fn(),
    update: jest.fn()
  };
  return {
    initializeApp: jest.fn(),
    firestore: jest.fn(() => firestoreMock),
  };
});
admin.firestore.FieldValue = {
    serverTimestamp: jest.fn()
};

// We must mock Stripe properly since it's instantiated immediately when index.js is required.
const mockStripeMock = {
    webhooks: {
        constructEvent: jest.fn()
    },
    checkout: {
        sessions: {
            create: jest.fn()
        }
    },
    subscriptions: {
        list: jest.fn(),
        cancel: jest.fn()
    }
};

jest.mock('stripe', () => {
    return jest.fn(() => mockStripeMock);
});

// Import the module after mocking
const { stripeWebhook } = require('./index.js');

describe('stripeWebhook', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        functionsTest.cleanup();
    });

    it('should return 400 when constructEvent throws an error', async () => {
        const req = {
            headers: {
                'stripe-signature': 'invalid_signature'
            },
            rawBody: 'raw_body_data'
        };

        const res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn()
        };

        // Simulate an error from stripe.webhooks.constructEvent
        const errorMessage = 'Invalid signature';
        mockStripeMock.webhooks.constructEvent.mockImplementation(() => {
            throw new Error(errorMessage);
        });

        // Suppress console.error in tests to avoid noisy output
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // Call the webhook
        await stripeWebhook(req, res);

        // Assertions
        expect(mockStripeMock.webhooks.constructEvent).toHaveBeenCalledWith('raw_body_data', 'invalid_signature', expect.any(String));
        expect(consoleSpy).toHaveBeenCalledWith('Webhook Error:', expect.any(Error));
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(`Webhook Error: ${errorMessage}`);

        consoleSpy.mockRestore();
    });
});
