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

jest.unstable_mockModule('../../js/auth.js', () => ({
  auth: { onAuthStateChanged: jest.fn() },
  db: { settings: jest.fn(), collection: jest.fn(() => ({ doc: jest.fn(() => ({ get: jest.fn() })) })) },
  getUserRedirectPath: (userData) => userData && userData.isAdmin ? 'admin.html' : 'index.html'
}));

const { loadNavbar } = await import('../../js/navbar.js');

describe('loadNavbar', () => {

  beforeEach(() => {
    document.body.innerHTML = '<div class="main-header"></div>';
    jest.clearAllMocks();
  });

  it('should inject navbar HTML', async () => {
    loadNavbar();
    expect(document.querySelector('.navbar')).not.toBeNull();
  });

});
