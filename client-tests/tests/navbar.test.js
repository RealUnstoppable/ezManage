import { jest } from "@jest/globals";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

global.window = Object.create(window);
global.window.firebase = {
    apps: [],
    initializeApp: jest.fn(),
    auth: jest.fn(() => ({
        onAuthStateChanged: jest.fn()
    })),
    firestore: jest.fn(() => ({
        collection: jest.fn(() => ({
            doc: jest.fn(() => ({
                get: jest.fn()
            }))
        }))
    }))
};
global.firebase = global.window.firebase;

// The gstatic URLs are mocked by moduleNameMapper pointing to __mocks__/firebase.js
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js';
import { getDoc, doc } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js';

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
  auth: {},
  db: { settings: jest.fn(), collection: jest.fn() },
  getUserRedirectPath: (userData) => userData && userData.isAdmin ? 'admin.html' : 'index.html'
}));

const { loadNavbar } = await import('../../js/navbar.js');

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
    const authCallback = onAuthStateChanged.mock.calls[0][1];

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ isAdmin: false })
    });

    await authCallback(mockUser);

    const authLink = document.getElementById('auth-link');
    expect(authLink.textContent).toBe('My Account');
    expect(authLink.href).toContain('index.html');
  });
});