import { jest } from "@jest/globals";

const mockAuthOnAuthStateChanged = jest.fn();
const mockFirebase = {
  apps: [],
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  auth: jest.fn(() => ({ onAuthStateChanged: mockAuthOnAuthStateChanged })),
  firestore: jest.fn(() => ({ collection: jest.fn(), settings: jest.fn() }))
};
global.window = global.window || Object.create(window);
global.window.firebase = mockFirebase;
global.firebase = mockFirebase;
globalThis.firebase = mockFirebase;

describe('loadNavbar', () => {
  let loadNavbar;
  let getDoc;
  let authModule;

  beforeAll(async () => {
    const firebaseFirestore = await import('https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js');
    getDoc = firebaseFirestore.getDoc;
    authModule = await import('../../js/auth.js');
    const navbarModule = await import('../../js/navbar.js');
    loadNavbar = navbarModule.loadNavbar;
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
    const authCallback = mockAuthOnAuthStateChanged.mock.calls[0][0];

    // Mocking db.collection().doc().get()
    const mockGet = jest.fn().mockResolvedValueOnce({
      exists: true,
      data: () => ({ isAdmin: false })
    });
    const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
    authModule.db.collection = jest.fn().mockReturnValue({ doc: mockDoc });

    await authCallback(mockUser);

    const authLink = document.getElementById('auth-link');
    expect(authLink.textContent).toBe('My Account');
    expect(authLink.href).toContain('index.html');
  });
});
