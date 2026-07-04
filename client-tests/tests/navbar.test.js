import { jest } from "@jest/globals";

global.window = global.window || {};
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

jest.unstable_mockModule('../../js/auth.js', () => ({
  auth: { onAuthStateChanged: jest.fn() },
  db: { collection: jest.fn(() => ({ doc: jest.fn(() => ({ get: jest.fn() })) })) },
  getUserRedirectPath: (userData) => userData && userData.isAdmin ? 'admin.html' : 'index.html'
}));

const { loadNavbar } = await import('../../js/navbar.js');
const { auth, db } = await import('../../js/auth.js');

describe('loadNavbar', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="main-header"></div>';
    jest.clearAllMocks();
  });

  it('should inject navbar HTML', () => {
    loadNavbar();
    expect(document.querySelector('.navbar')).not.toBeNull();
  });

  it('should set auth link to index.html if user is logged in but not admin', async () => {
    loadNavbar();

    const mockUser = { uid: '123' };

    const mockGet = jest.fn().mockResolvedValueOnce({
      exists: true,
      data: () => ({ isAdmin: false })
    });
    const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
    db.collection = jest.fn().mockReturnValue({ doc: mockDoc });

    const authCallback = auth.onAuthStateChanged.mock.calls[0][0];
    await authCallback(mockUser);
    await new Promise(process.nextTick);

    const authLink = document.getElementById('auth-link');
    expect(authLink.textContent).toBe('My Account');
    expect(authLink.href).toContain('index.html');
  });
});
