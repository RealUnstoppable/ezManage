import { jest } from "@jest/globals";

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
  auth: { onAuthStateChanged: jest.fn() },
  db: { settings: jest.fn(), collection: jest.fn() },
  getUserRedirectPath: (userData) => userData && userData.isAdmin ? 'admin.html' : 'index.html'
}));

const mockOnAuthStateChanged = jest.fn();
jest.unstable_mockModule('https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js', () => ({
    onAuthStateChanged: mockOnAuthStateChanged
}));

const mockGetDoc = jest.fn();
jest.unstable_mockModule('https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js', () => ({
    getDoc: mockGetDoc,
    doc: jest.fn()
}));

const authModule = await import('../../js/auth.js');
const { loadNavbar } = await import('../../js/navbar.js');

describe('loadNavbar', () => {
  beforeAll(() => {
    window.firebase = mockFirebase;
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

    // The original test accessed onAuthStateChanged from gstatic
    const authCallback = mockOnAuthStateChanged.mock.calls[0][1];

    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ isAdmin: false })
    });

    await authCallback(mockUser);

    const authLink = document.getElementById('auth-link');
    expect(authLink.textContent).toBe('My Account');
    expect(authLink.href).toContain('index.html');
  });
});
