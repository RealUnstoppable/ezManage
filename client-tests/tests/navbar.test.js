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

jest.unstable_mockModule("https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js", () => ({
  getAuth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
  onAuthStateChanged: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendEmailVerification: jest.fn()
}));

jest.unstable_mockModule("https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js", () => ({
  getFirestore: jest.fn(() => ({ collection: jest.fn(), settings: jest.fn() })),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  serverTimestamp: jest.fn()
}));

jest.unstable_mockModule("https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js", () => ({
    initializeApp: jest.fn()
}));

const { loadNavbar } = await import('../../js/navbar.js');

describe('loadNavbar', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="main-header"></div>';
    jest.clearAllMocks();
  });

  it('should inject navbar HTML', async () => {
    loadNavbar();
    const header = document.querySelector('.main-header');
    expect(header).not.toBeNull();
    expect(header.innerHTML).toContain('class="nav-logo"');
    expect(header.innerHTML).toContain('href="index.html"');
    expect(header.innerHTML).toContain('id="auth-link"');
  });

  it('should fallback gracefully if main-header is missing', () => {
      document.body.innerHTML = '<div>No header here</div>';
      expect(() => loadNavbar()).not.toThrow();
  });
});
