import { jest } from "@jest/globals";

// The gstatic URLs are mocked by moduleNameMapper pointing to __mocks__/firebase.js
jest.unstable_mockModule("https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js", () => ({
  onAuthStateChanged: jest.fn(),
  getAuth: jest.fn(),
}));

jest.unstable_mockModule("https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js", () => ({
  getDoc: jest.fn(),
  doc: jest.fn(),
  getFirestore: jest.fn()
}));

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

jest.unstable_mockModule('../../js/auth.js', () => ({
  auth: { onAuthStateChanged: jest.fn() },
  db: { settings: jest.fn(), collection: jest.fn() },
  getUserRedirectPath: (userData) => userData && userData.isAdmin ? 'admin.html' : 'index.html',
  fetchUserDoc: jest.fn()
}));

describe('loadNavbar', () => {
  let loadNavbar;
  let onAuthStateChanged;
  let getDoc;

  beforeAll(async () => {
    const navbarModule = await import('../../js/navbar.js');
    loadNavbar = navbarModule.loadNavbar;
    const authFirebaseModule = await import("https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js");
    onAuthStateChanged = authFirebaseModule.onAuthStateChanged;
    const firestoreFirebaseModule = await import("https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js");
    getDoc = firestoreFirebaseModule.getDoc;
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
