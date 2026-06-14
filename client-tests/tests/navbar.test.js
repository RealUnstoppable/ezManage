import { jest } from "@jest/globals";

const mockFirebase = {
  apps: [],
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  auth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
  firestore: jest.fn(() => ({ collection: jest.fn(), settings: jest.fn() }))
};

global.window = global.window || {};
global.window.firebase = mockFirebase;
global.firebase = mockFirebase;
globalThis.firebase = mockFirebase;

jest.unstable_mockModule('../../js/auth.js', () => ({
  auth: { onAuthStateChanged: jest.fn() },
  db: { settings: jest.fn(), collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn()
    }))
  })) },
  getUserRedirectPath: (userData) => userData && userData.isAdmin ? 'admin.html' : 'index.html'
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
    const authModule = await import('../../js/auth.js');
    let authCallback;
    authModule.auth.onAuthStateChanged.mockImplementation(cb => { authCallback = cb; });

    loadNavbar();

    // Simulate user logged in
    const mockUser = { uid: '123' };

    // Setup db get mock to return a non-admin user doc
    const mockGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ isAdmin: false })
    });
    authModule.db.collection.mockReturnValue({
      doc: jest.fn().mockReturnValue({ get: mockGet })
    });

    await authCallback(mockUser);

    const authLink = document.getElementById('auth-link');
    expect(authLink.textContent).toBe('My Account');
    expect(authLink.href).toContain('index.html');
  });
});
