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

const mockGet = jest.fn();

jest.unstable_mockModule('../../js/auth.js', () => ({
  auth: { onAuthStateChanged: jest.fn() },
  db: {
    settings: jest.fn(),
    collection: jest.fn(() => ({ doc: jest.fn(() => ({ get: mockGet })) }))
  },
  getUserRedirectPath: (userData) => userData && userData.isAdmin ? 'admin.html' : 'index.html',
  fetchUserDoc: jest.fn()
}));

const { loadNavbar } = await import('../../js/navbar.js');
const { auth, db } = await import('../../js/auth.js');

describe('loadNavbar', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="main-header"></div>';
    jest.clearAllMocks();
    mockGet.mockReset();
  });

  it('should inject navbar HTML', async () => {
    loadNavbar();
    expect(document.querySelector('.navbar')).not.toBeNull();
  });

  it('should set auth link to index.html if user is logged in but not admin', async () => {
    loadNavbar();

    const mockUser = { uid: '123' };
    const authCallback = auth.onAuthStateChanged.mock.calls[0][0];

    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ isAdmin: false })
    });

    await authCallback(mockUser);

    // allow async ops to finish
    await new Promise(process.nextTick);

    const authLink = document.getElementById('auth-link');
    expect(authLink.textContent).toBe('My Account');
    expect(authLink.href).toContain('index.html');
  });
});
