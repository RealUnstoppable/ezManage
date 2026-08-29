import { logManagerError } from './utils.js';
import { auth, db, getUserRedirectPath, fetchUserDoc } from './auth.js';


export function loadNavbar() {
    // ezManage has its own native fixed navbar (nav.glass-nav).
    // Leave main-header empty to prevent duplicate navbar elements from realunstoppable.store.
    const header = document.querySelector('.main-header');
    if (header) {
        header.innerHTML = '';
    }
}

function attachNavEvents() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }
}

function updateAuthLink() {
    const authLink = document.getElementById('auth-link');
    if (!authLink) return;

    authLink.addEventListener('click', (e) => {
        if (typeof window.handleNavAccountClick === 'function') {
            e.preventDefault();
            window.handleNavAccountClick();
        }
    });

    if (auth && auth.onAuthStateChanged) {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    // ⚡ Bolt Optimization: Use cached fetchUserDoc instead of db.collection().doc().get()
                    // This prevents redundant concurrent network requests when onAuthStateChanged fires across multiple files.
                    const userDoc = await fetchUserDoc(user.uid);
                    const destination = userDoc.exists ? getUserRedirectPath(userDoc.data()) : 'account.html';
                    authLink.href = destination;
                    authLink.textContent = "My Account";
                } catch (e) {
                    logManagerError(`Navbar auth state error for uid: ${user.uid}`, e);
                }
            } else {
                authLink.href = 'sign in beta.html';
                authLink.textContent = "Sign In / Sign Up";
            }
        });
    } else {
        authLink.href = 'sign in beta.html';
        authLink.textContent = "Sign In / Sign Up";
    }
}
