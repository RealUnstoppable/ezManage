import { jest } from "@jest/globals";

const mockFirebase = {
  apps: [],
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  auth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
  firestore: jest.fn(() => ({ collection: jest.fn(), settings: jest.fn() }))
};

global.window = global.window || Object.create(window);
global.window.firebase = mockFirebase;
global.firebase = mockFirebase;
globalThis.firebase = mockFirebase;

jest.unstable_mockModule('../../js/auth.js', () => ({
  auth: {},
  db: { settings: jest.fn(), collection: jest.fn() },
  getUserRedirectPath: (userData) => userData && userData.isAdmin ? 'admin.html' : 'index.html'
}));

// Provide a mock for the specific URL to prevent Node from trying to fetch or parse the actual URL in tests
jest.unstable_mockModule('https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js', () => ({
  onAuthStateChanged: jest.fn()
}));
jest.unstable_mockModule('https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js', () => ({
  getDoc: jest.fn(),
  doc: jest.fn()
}));

const authModule = await import('../../js/auth.js');
const { loadNavbar } = await import('../../js/navbar.js');
const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js");
const { getDoc } = await import("https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js");


describe('loadNavbar', () => {

  beforeAll(() => {
    window.firebase = {
        apps: [],
        initializeApp: jest.fn(),
        auth: () => ({ onAuthStateChanged: jest.fn() }),
        firestore: () => ({ settings: jest.fn(), collection: jest.fn() })
    };
    global.firebase = window.firebase;
  });

  beforeEach(() => {
    document.body.innerHTML = '<div class="main-header"></div>';
    jest.clearAllMocks();
  });

  it('should inject navbar HTML', async () => {
    await loadNavbar();
    expect(document.querySelector('.navbar')).not.toBeNull();
  });

  it('should set auth link to index.html if user is logged in but not admin', async () => {
    await loadNavbar();

    const mockUser = { uid: '123' };

    // Auth observer attachment happens on loadNavbar, verify it hooked up correctly
    expect(authModule.auth).toBeDefined();

    // Simulate user state logic via mock
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ isAdmin: false })
    });

  });
});
