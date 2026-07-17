import { jest } from "@jest/globals";

// Setup global firebase mock
const mockGet = jest.fn();
const mockDoc = jest.fn(() => ({ get: mockGet }));
const mockCollection = jest.fn(() => ({ doc: mockDoc }));

global.window = global.window || {};
global.firebase = {
    apps: [],
    initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
    auth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
    firestore: jest.fn(() => ({
        collection: mockCollection,
        settings: jest.fn()
    }))
};
global.window.firebase = global.firebase;

// Mock auth module
const mockOnAuthStateChanged = jest.fn();
jest.unstable_mockModule('../../js/auth.js', () => ({
    auth: { onAuthStateChanged: mockOnAuthStateChanged },
    db: { collection: mockCollection },
    getUserRedirectPath: (userData) => userData && userData.isAdmin ? 'admin.html' : 'index.html',
    fetchUserDoc: jest.fn(async () => ({ exists: true, data: () => ({ isAdmin: false }) }))
}));

describe('loadNavbar', () => {
    let loadNavbar;

    beforeAll(async () => {
        const navbarModule = await import('../../js/navbar.js');
        loadNavbar = navbarModule.loadNavbar;
    });

    beforeEach(() => {
        document.body.innerHTML = '<div class="main-header"></div>';
        jest.clearAllMocks();
    });

    it('should inject navbar HTML', async () => {
        loadNavbar();
        expect(document.querySelector('.navbar')).not.toBeNull();
    });

    it('should set auth link to index.html if user is logged in but not admin', async () => {
        loadNavbar();

        // Simulate user being logged in
        const authCallback = mockOnAuthStateChanged.mock.calls[0][0];
        const mockUser = { uid: '123' };

        // mockGet and mockDoc are already setup to return the mock user data
        mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ isAdmin: false })
        });

        await authCallback(mockUser);

        const authLink = document.getElementById('auth-link');
        expect(authLink.textContent).toBe('My Account');
        expect(authLink.href).toContain('index.html');
    });
});
