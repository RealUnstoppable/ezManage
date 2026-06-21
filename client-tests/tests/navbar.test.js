import { jest } from "@jest/globals";

const mockFirebase = {
  apps: [],
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  auth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
  firestore: jest.fn(() => ({
      collection: jest.fn(() => ({ doc: jest.fn(() => ({ get: jest.fn() })) })),
      settings: jest.fn()
  }))
};

global.window = global.window || {};
global.window.firebase = mockFirebase;
global.firebase = mockFirebase;
globalThis.firebase = mockFirebase;

jest.unstable_mockModule('https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js', () => ({
  onAuthStateChanged: jest.fn()
}));
jest.unstable_mockModule('https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js', () => ({
  getDoc: jest.fn(), doc: jest.fn()
}));
jest.unstable_mockModule('../../js/auth.js', () => ({
  auth: { onAuthStateChanged: jest.fn() },
  db: { settings: jest.fn(), collection: jest.fn() },
  getUserRedirectPath: (userData) => userData && userData.isAdmin ? 'admin.html' : 'index.html',
  fetchUserDoc: jest.fn()
}));

const { loadNavbar } = await import('../../js/navbar.js');
const { auth, db } = await import('../../js/auth.js');

describe('loadNavbar', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="main-header"></div>';
    jest.clearAllMocks();
  });

  it('should inject navbar HTML', async () => {
    loadNavbar();
    expect(document.querySelector('.navbar')).not.toBeNull();
  });

  it('should set auth link to index.html if user is logged in but not admin', async () => {
    await loadNavbar();

    const mockUser = { uid: '123' };

    // Check if onAuthStateChanged was called and trigger callback
    if (auth.onAuthStateChanged.mock.calls.length > 0) {
      const authCallback = auth.onAuthStateChanged.mock.calls[0][0];

      const mockGet = jest.fn().mockResolvedValueOnce({
        exists: true,
        data: () => ({ isAdmin: false })
      });

      db.collection.mockReturnValueOnce({
        doc: jest.fn().mockReturnValueOnce({
          get: mockGet
        })
      });

      await authCallback(mockUser);

      await new Promise(process.nextTick);

      const authLink = document.getElementById('auth-link');
      if (authLink) {
        expect(authLink.textContent).toBe('My Account');
        expect(authLink.href).toContain('index.html');
      }
    }
  });
});
