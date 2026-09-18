import { jest } from "@jest/globals";

global.window = global.window || {};
global.window.firebase = {
    apps: [],
    initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
    app: jest.fn(() => ({ name: '[DEFAULT]' })),
    auth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
    firestore: jest.fn(() => ({ collection: jest.fn(), settings: jest.fn() })),
    functions: jest.fn(() => ({ httpsCallable: jest.fn() }))
};

// Mock window location
delete global.window.location;
global.window.location = {
    search: '?group=test_group',
    href: 'http://localhost/shop.html',
    assign: jest.fn(),
    replace: jest.fn()
};

describe('calculateCartTotal', () => {
    let calculateCartTotal;

    beforeAll(async () => {
        const shopModule = await import('../shop.js');
        calculateCartTotal = shopModule.calculateCartTotal;
    });

    const mockProductMap = {
        'prod1': { id: 'prod1', price: 10.00 },
        'prod2': { id: 'prod2', price: 25.50 },
        'prod3': { id: 'prod3', price: 5.00 },
    };

    it('should correctly calculate total', () => {
        const cart = { 'prod1': 2, 'prod2': 1 };
        const total = calculateCartTotal(cart, mockProductMap);
        expect(total).toBe(45.50);
    });
});
