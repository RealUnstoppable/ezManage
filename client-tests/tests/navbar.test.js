import { jest } from "@jest/globals";

// The gstatic URLs are mocked by moduleNameMapper pointing to __mocks__/firebase.js
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js';
import { getDoc } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js';

global.window = global.window || {};
global.firebase = {
  apps: [],
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  auth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
  firestore: jest.fn(() => ({ collection: jest.fn(), settings: jest.fn() }))
};
global.window.firebase = global.firebase;
globalThis.firebase = global.firebase;

jest.unstable_mockModule('../../js/auth.js', () => ({
  auth: { onAuthStateChanged: jest.fn() },
  db: {
      collection: jest.fn(() => ({
          doc: jest.fn(() => ({
              get: jest.fn()
          }))
      })),
      settings: jest.fn()
  },
  getUserRedirectPath: (userData) => userData && userData.isAdmin ? 'admin.html' : 'index.html'
}));

const { loadNavbar } = await import('../../js/navbar.js');
const authModule = await import('../../js/auth.js');

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
    const authCallback = authModule.auth.onAuthStateChanged.mock.calls[0][0];

    // Mock the get() to return a document snapshot
    authModule.db.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ isAdmin: false })
            })
        })
    });

    await authCallback(mockUser);

    const authLink = document.getElementById('auth-link');
    expect(authLink.textContent).toBe('My Account');
    expect(authLink.href).toContain('index.html');
  });
});
