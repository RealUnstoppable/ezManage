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

const mockOnAuthStateChanged = jest.fn();
jest.unstable_mockModule('https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js', () => ({
    onAuthStateChanged: mockOnAuthStateChanged
}));

const mockGetDoc = jest.fn();
jest.unstable_mockModule('https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js', () => ({
    getDoc: mockGetDoc,
    doc: jest.fn()
}));

const navbar = await import('../../js/navbar.js');
const loadNavbar = navbar.loadNavbar;

describe('loadNavbar', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="main-header"></div>';
    jest.clearAllMocks();
  });

  it('should empty main-header to prevent duplicates', () => {
    document.querySelector('.main-header').innerHTML = '<div>old</div>';
    loadNavbar();
    expect(document.querySelector('.main-header').innerHTML).toBe('');
  });
});
