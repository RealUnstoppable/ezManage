import { jest } from '@jest/globals';

// Simple DOM & LocalStorage shim for Node environment
global.document = {
    body: {
        dataset: {}
    }
};
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

// Mock auth.js to control auth state
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
        // Clear dataset
        Object.keys(document.body.dataset).forEach(key => delete document.body.dataset[key]);
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
