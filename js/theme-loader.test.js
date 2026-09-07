import { jest } from '@jest/globals';

class DatasetMock {
    constructor() { this._data = {}; }
    get theme() { return this._data.theme; }
    set theme(val) { this._data.theme = val; }
    get accent() { return this._data.accent; }
    set accent(val) { this._data.accent = val; }
}

global.document = {
    body: {
        setAttribute: jest.fn(),
        classList: { toggle: jest.fn(), add: jest.fn() }
    }
};
Object.defineProperty(global.document.body, 'dataset', {
    value: new DatasetMock(),
    writable: true,
    configurable: true
});

global.localStorage = {
    store: {},
    getItem(key) { return this.store[key] || null; },
    setItem(key, value) { this.store[key] = value.toString(); },
    clear() { this.store = {}; }
};
global.window = {
    localStorage: global.localStorage,
    updateTheme: null
};

global.window.firebase = global.window.firebase || {
    apps: [],
    initializeApp: jest.fn(),
    auth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
    firestore: jest.fn(() => ({ collection: jest.fn() }))
};
global.firebase = global.window.firebase;

const mockAuth = { currentUser: null };
jest.unstable_mockModule('./auth.js', () => ({
  auth: mockAuth,
  db: {},
  onAuthStateChanged: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn()
}));

const { applyTheme } = await import('./theme-loader.js');

describe('applyTheme', () => {
    beforeEach(() => {
        document.body.dataset = new DatasetMock();
        localStorage.clear();
        mockAuth.currentUser = null;
    });

    test('should apply default values when no arguments provided', () => {
        applyTheme();
        expect(document.body.dataset.theme).toBe('dark');
        expect(document.body.dataset.accent).toBe('blue');
    });

    test('should apply custom theme and accent color', () => {
        applyTheme('light', 'red');
        expect(document.body.dataset.theme).toBe('light');
        expect(document.body.dataset.accent).toBe('red');
    });

    test('should use default values if arguments are null/undefined', () => {
        applyTheme(null, undefined);
        expect(document.body.dataset.theme).toBe('dark');
        expect(document.body.dataset.accent).toBe('blue');
    });

    test('should persist theme to localStorage when user is NOT logged in', () => {
        mockAuth.currentUser = null;
        applyTheme('light', 'green');
        expect(localStorage.getItem('userTheme')).toBe('light');
        expect(localStorage.getItem('userAccent')).toBe('green');
    });

    test('should NOT persist theme to localStorage when user IS logged in', () => {
        mockAuth.currentUser = { uid: '123' };
        applyTheme('ocean', 'white');
        expect(localStorage.getItem('userTheme')).toBeNull();
        expect(localStorage.getItem('userAccent')).toBeNull();
    });
});
