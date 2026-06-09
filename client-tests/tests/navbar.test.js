import { jest } from "@jest/globals";

const mockFirebase = {
  apps: [],
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  auth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
  firestore: jest.fn(() => ({ collection: jest.fn(), settings: jest.fn() }))
};

global.window = global.window || {};
global.window.firebase = mockFirebase;
globalThis.firebase = mockFirebase;
global.firebase = mockFirebase;

const getMock = jest.fn();

jest.unstable_mockModule('../../js/auth.js', () => ({
  auth: {
      onAuthStateChanged: jest.fn()
  },
  db: {
      collection: jest.fn(() => ({
          doc: jest.fn(() => ({
              get: getMock
          }))
      }))
  },
  getUserRedirectPath: (userData) => userData && userData.isAdmin ? 'admin.html' : 'index.html'
}));

const authModule = await import('../../js/auth.js');
const { loadNavbar } = await import('../../js/navbar.js');

describe('loadNavbar', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="main-header"></div>';
    jest.clearAllMocks();
    getMock.mockReset();
  });

  it('should inject navbar HTML', async () => {
    await loadNavbar();
    expect(document.querySelector('.navbar')).not.toBeNull();
  });

  it('should set auth link to index.html if user is logged in but not admin', async () => {
    await loadNavbar();
    const mockUser = { uid: '123' };
    const authCallback = authModule.auth.onAuthStateChanged.mock.calls[0][0];

    getMock.mockResolvedValueOnce({
      exists: true,
      data: () => ({ isAdmin: false })
    });

    await authCallback(mockUser);

    const authLink = document.getElementById('auth-link');
    expect(authLink.textContent).toBe('My Account');
    expect(authLink.href).toContain('index.html');
  });
});
