import { jest } from "@jest/globals";

global.window = global.window || {};
global.firebase = {
    apps: [],
    initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
    app: jest.fn(() => ({ name: '[DEFAULT]' })),
    auth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
    firestore: jest.fn(() => ({ collection: jest.fn(), settings: jest.fn() })),
    functions: jest.fn(() => ({ httpsCallable: jest.fn() }))
};
global.window.firebase = global.firebase;

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

global.firebase = global.window.firebase;

// Mock window location
delete global.window.location;
global.window.location = {
    search: '?group=test_group',
    href: 'http://localhost/shop.html',
    assign: jest.fn(),
    replace: jest.fn()
};

const mockAddDoc = jest.fn();
jest.unstable_mockModule('https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js', () => ({
    collection: jest.fn(),
    addDoc: mockAddDoc,
    getDocs: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    getFirestore: jest.fn(),
    serverTimestamp: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    setDoc: jest.fn()
}));

jest.unstable_mockModule('https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js', () => ({
    getAuth: jest.fn(),
    onAuthStateChanged: jest.fn()
}));

const shop = await import('../shop.js');

describe('Shop Functions', () => {
    it('should be defined', () => {
        expect(shop.initShop).toBeDefined();
    });
});
