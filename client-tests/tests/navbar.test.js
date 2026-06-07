import { jest } from "@jest/globals";

// The gstatic URLs are mocked by moduleNameMapper pointing to __mocks__/firebase.js
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js';
import { getDoc } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js';

const mockFirebase = {
  apps: [],
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  auth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
  firestore: jest.fn(() => ({ collection: jest.fn(), settings: jest.fn() }))
};

global.window = global.window || {};
global.window.firebase = mockFirebase;
globalThis.firebase = mockFirebase;

jest.unstable_mockModule('../../js/auth.js', () => ({
  auth: {
      onAuthStateChanged: jest.fn()
  },
  db: { settings: jest.fn(), collection: jest.fn() },
  getUserRedirectPath: (userData) => userData && userData.isAdmin ? 'admin.html' : 'index.html'
}));

const authModule = await import('../../js/auth.js');
const { loadNavbar } = await import('../../js/navbar.js');

describe('loadNavbar', () => {

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

    // The actual application code uses auth.onAuthStateChanged
    const authCallback = authModule.auth.onAuthStateChanged.mock.calls[0][0];

    authModule.db.collection = jest.fn(() => ({
        doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ isAdmin: false })
            })
        }))
    }));

    await authCallback(mockUser);

    const authLink = document.getElementById('auth-link');
    expect(authLink.textContent).toBe('My Account');
    expect(authLink.href).toContain('index.html');
  });
});