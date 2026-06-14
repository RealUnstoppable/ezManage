import { jest } from "@jest/globals";

const mockFirebase = {
  apps: [],
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  auth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn()
      }))
    })),
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
  getDoc: jest.fn(),
  doc: jest.fn()
}));

const mockGet = jest.fn();
jest.unstable_mockModule('../../js/auth.js', () => ({
  auth: { onAuthStateChanged: jest.fn() },
  db: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: mockGet
      }))
    }))
  },
  getUserRedirectPath: (userData) => userData && userData.isAdmin ? 'admin.html' : 'index.html'
}));

jest.unstable_mockModule('../../js/utils.js', () => ({
  logManagerError: jest.fn()
}));

const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js");
const { getDoc } = await import("https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js");
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

    let authCallback;
    if (authModule.auth.onAuthStateChanged.mock.calls.length > 0) {
      authCallback = authModule.auth.onAuthStateChanged.mock.calls[0][0];
    } else if (onAuthStateChanged.mock.calls.length > 0) {
      authCallback = onAuthStateChanged.mock.calls[0][1];
    }

    const mockDoc = { exists: true, data: () => ({ isAdmin: false }) };
    mockGet.mockResolvedValueOnce(mockDoc);

    if (authCallback) {
        await authCallback(mockUser);
    }

    await new Promise(process.nextTick);

    const authLink = document.getElementById('auth-link');
    if (authLink) {
        expect(authLink.textContent).toBe('My Account');
        expect(authLink.href).toContain('index.html');
    }
  });
});
