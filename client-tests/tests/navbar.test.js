import { jest } from "@jest/globals";

// Map globals first before dynamic imports
global.window = global.window || {};
global.firebase = {
    apps: [],
    auth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
    firestore: jest.fn(() => ({ collection: jest.fn(), settings: jest.fn() })),
    initializeApp: jest.fn()
};
global.window.firebase = global.firebase;

const mockFirebase = {
  apps: [],
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  auth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
  firestore: jest.fn(() => ({
      collection: jest.fn(() => ({ doc: jest.fn(() => ({ get: jest.fn() })) })),
      settings: jest.fn()
  }))
};
global.window.firebase = mockFirebase;
global.firebase = mockFirebase;

jest.unstable_mockModule("https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js", () => ({
    onAuthStateChanged: jest.fn(),
    getAuth: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    sendEmailVerification: jest.fn()
}));

jest.unstable_mockModule("https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js", () => ({
    getDoc: jest.fn(),
    doc: jest.fn(),
    getFirestore: jest.fn(),
    setDoc: jest.fn(),
    serverTimestamp: jest.fn()
}));

jest.unstable_mockModule('../../js/auth.js', () => ({
  auth: { onAuthStateChanged: jest.fn() },
  db: { collection: jest.fn(() => ({ doc: jest.fn(() => ({ get: jest.fn() })) })) },
  getUserRedirectPath: (userData) => userData && userData.isAdmin ? 'admin.html' : 'index.html'
}));

describe('loadNavbar', () => {
  let loadNavbar;
  let authModule;

  beforeAll(async () => {
    const navbarModule = await import('../../js/navbar.js');
    loadNavbar = navbarModule.loadNavbar;
    authModule = await import('../../js/auth.js');
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
    await loadNavbar();

    const authCallback = authModule.auth.onAuthStateChanged.mock.calls[0][0];

    const mockGet = jest.fn().mockResolvedValueOnce({
      exists: true,
      data: () => ({ isAdmin: false })
    });

    authModule.db.collection.mockReturnValue({
      doc: jest.fn().mockReturnValue({ get: mockGet })
    });

    await authCallback({ uid: '123' });
    await new Promise(process.nextTick);

    const authLink = document.getElementById('auth-link');
    expect(authLink.textContent).toBe('My Account');
    expect(authLink.href).toContain('index.html');
  });
});
