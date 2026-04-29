import { loadNavbar } from '../../js/navbar.js';
import * as authModule from '../../js/auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

jest.mock('../../js/auth.js', () => ({
  auth: {},
  db: {}
}));

describe('loadNavbar', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="main-header"></div>';
    jest.clearAllMocks();
  });

  it('should inject navbar HTML into .main-header if it exists', () => {
    loadNavbar();
    const header = document.querySelector('.main-header');
    expect(header.innerHTML).toContain('<nav class="navbar">');
    expect(header.innerHTML).toContain('<a href="index.html" class="nav-logo">un<span></span></a>');
  });

  it('should not throw error if .main-header does not exist', () => {
    document.body.innerHTML = '';
    expect(() => loadNavbar()).not.toThrow();
  });

  it('should attach click event to hamburger menu', () => {
    loadNavbar();
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    expect(hamburger.classList.contains('active')).toBe(false);
    expect(navLinks.classList.contains('active')).toBe(false);

    hamburger.click();

    expect(hamburger.classList.contains('active')).toBe(true);
    expect(navLinks.classList.contains('active')).toBe(true);
  });

  it('should set auth link to sign in if user is not logged in', () => {
    onAuthStateChanged.mockImplementationOnce((auth, callback) => {
      callback(null);
    });

    loadNavbar();

    const authLink = document.getElementById('auth-link');
    expect(authLink.href).toContain('sign%20in%20beta.html');
    expect(authLink.textContent).toBe('Sign In / Sign Up');
  });

  it('should set auth link to account.html if user is logged in but not admin', async () => {
    onAuthStateChanged.mockImplementationOnce(async (auth, callback) => {
      await callback({ uid: 'user123' });
    });

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ isAdmin: false })
    });

    loadNavbar();

    // We need to wait for the async callback to finish
    await new Promise(process.nextTick);

    const authLink = document.getElementById('auth-link');
    expect(authLink.href).toContain('account.html');
    expect(authLink.textContent).toBe('My Account');
  });

  it('should set auth link to admin.html if user is logged in and admin', async () => {
    onAuthStateChanged.mockImplementationOnce(async (auth, callback) => {
      await callback({ uid: 'admin123' });
    });

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ isAdmin: true })
    });

    loadNavbar();

    await new Promise(process.nextTick);

    const authLink = document.getElementById('auth-link');
    expect(authLink.href).toContain('admin.html');
    expect(authLink.textContent).toBe('My Account');
  });
});
