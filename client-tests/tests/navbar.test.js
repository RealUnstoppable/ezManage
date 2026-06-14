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

const mockGetDoc = jest.fn();
const mockCollection = jest.fn(() => ({
    doc: jest.fn(() => ({
        get: mockGetDoc
    }))
}));

jest.unstable_mockModule('../../js/auth.js', () => ({
  auth: {
    onAuthStateChanged: jest.fn()
  },
  db: { settings: jest.fn(), collection: mockCollection },
  getUserRedirectPath: (userData) => userData && userData.isAdmin ? 'admin.html' : 'index.html'
}));

const mockOnAuthStateChanged = jest.fn();
jest.unstable_mockModule('https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js', () => ({
  onAuthStateChanged: mockOnAuthStateChanged
}));

jest.unstable_mockModule('https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js', () => ({
  getDoc: mockGetDoc,
  doc: jest.fn()
}));

const authModule = await import('../../js/auth.js');
const { loadNavbar } = await import('../../js/navbar.js');
const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js');
const { getDoc } = await import('https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js');

  auth: { onAuthStateChanged: jest.fn() },
  db: { settings: jest.fn(), collection: jest.fn(() => ({ doc: jest.fn(() => ({ get: jest.fn() })) })) },
global.window = global.window || {};
global.firebase = {
    apps: [],
    auth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
    firestore: jest.fn(() => ({ collection: jest.fn() }))
};
global.window.firebase = global.firebase;

jest.unstable_mockModule('../../js/auth.js', () => ({
  auth: { onAuthStateChanged: jest.fn() },
  db: { collection: jest.fn(() => ({ doc: jest.fn(() => ({ get: jest.fn() })) })) },
  getUserRedirectPath: (userData) => userData && userData.isAdmin ? 'admin.html' : 'index.html'
}));

const { loadNavbar } = await import('../../js/navbar.js');

describe('loadNavbar', () => {

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

    // In js/navbar.js it calls auth.onAuthStateChanged(callback) directly from the v8 compat SDK exported in auth.js.
    const authCallback = authModule.auth.onAuthStateChanged.mock.calls[0][0];

    mockGetDoc.mockResolvedValueOnce({
      exists: true, // actually the file tests `userDoc.exists`, in some firebase versions it's a property
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

    const authLink = document.getElementById('auth-link');
    expect(authLink.textContent).toBe('My Account');
    expect(authLink.href).toContain('index.html');
  });
});
