import { jest } from "@jest/globals";

global.window = global.window || {};
global.firebase = {
    apps: [],
    auth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
    firestore: jest.fn(() => ({ collection: jest.fn(), settings: jest.fn() })),
    initializeApp: jest.fn()
};
global.window.firebase = global.firebase;

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

  beforeAll(async () => {
    const navbarModule = await import('../../js/navbar.js');
    loadNavbar = navbarModule.loadNavbar;
  });

  beforeEach(() => {
    document.body.innerHTML = '<div class="main-header"></div>';
    jest.clearAllMocks();
  });

  it('should inject navbar HTML into the main-header element', () => {
    loadNavbar();
    const header = document.querySelector('.main-header');
    expect(header.innerHTML).toContain('<nav');
  });

  it('should not throw if main-header element does not exist', () => {
    document.body.innerHTML = '';
    expect(() => loadNavbar()).not.toThrow();
  });
});
