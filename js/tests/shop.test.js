
import { jest } from "@jest/globals";

global.window = global.window || {};
const mockFirebase = {
    apps: [],
    initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
    auth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
    firestore: jest.fn(() => ({ collection: jest.fn(), settings: jest.fn() })),
    functions: jest.fn(() => ({ httpsCallable: jest.fn() }))
};
global.window.firebase = mockFirebase;
global.firebase = mockFirebase;

jest.unstable_mockModule('../../firebase.js', () => ({
  auth: { onAuthStateChanged: jest.fn() },
  db: { collection: jest.fn(() => ({ doc: jest.fn(() => ({ get: jest.fn() })) })) },
}));

const shop = await import('../shop.js');
const calculateCartTotal = shop.calculateCartTotal;

describe('calculateCartTotal', () => {
    const mockProductMap = {
        'prod1': { id: 'prod1', price: 10.00 },
        'prod2': { id: 'prod2', price: 25.50 },
        'prod3': { id: 'prod3', price: 5.00 },
    };

    it('should return 0 for an empty cart', () => {
        const cartData = {};
        const total = calculateCartTotal(cartData, mockProductMap);
        expect(total).toBe(0);
    });

    it('should calculate the correct total for a cart with items', () => {
        const cartData = {
            'prod1': 2, // 20.00
            'prod2': 1, // 25.50
        };
        const total = calculateCartTotal(cartData, mockProductMap);
        expect(total).toBe(45.50);
    });

    it('should ignore products not found in the product map', () => {
        const cartData = {
            'prod1': 1, // 10.00
            'missing-prod': 3, // should be ignored
        };
        const total = calculateCartTotal(cartData, mockProductMap);
        expect(total).toBe(10.00);
    });

    it('should calculate the total correctly with multiple items and quantities', () => {
        const cartData = {
            'prod1': 3, // 30.00
            'prod2': 2, // 51.00
            'prod3': 5, // 25.00
        };
        const total = calculateCartTotal(cartData, mockProductMap);
        expect(total).toBe(106.00);
    });

    it('should handle zero quantities correctly', () => {
        const cartData = {
            'prod1': 0, // 0.00
            'prod2': 1, // 25.50
        };
        const total = calculateCartTotal(cartData, mockProductMap);
        expect(total).toBe(25.50);
    });
});
