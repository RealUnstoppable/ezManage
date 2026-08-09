import { logManagerError } from './utils.js';
import { auth, db, getUserRedirectPath } from './auth.js';


export function loadNavbar() {
    const headerHTML = `
    <nav class="navbar">
        <div class="flex items-center gap-3">
            <button onclick="if(window.toggleSidebar){window.toggleSidebar();}" class="p-1.5 text-slate-300 hover:text-sky-400 transition-colors cursor-pointer" aria-label="Toggle Menu">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>
            <a href="index.html" class="nav-logo">ez<span>Manage</span></a>
        </div>
        <ul class="nav-links">
            <li><a href="index.html">Overview</a></li>
            <li><a href="unstoppable.html">Unstoppable</a></li>
            <li><a href="dreamstimeskip.html">Dreams TimeSkip</a></li>
            <li><a href="harmonytunes.html">HarmonyTunes</a></li>
            <li><a href="shop.html">Shop</a></li>
            <li><a href="memberships.html">Memberships</a></li>
            <li><a href="blog.html">Blog</a></li>
            <li><a href="portfolio.html">About Me</a></li>
            <li><a href="uds.html">UDS</a></li>
            <li><a href="index.html#incidents" onclick="if(window.navTo){event.preventDefault();window.navTo('incidents');}">Incident Reports</a></li>
            <li><a href="sign in beta.html" id="auth-link">Sign In / Sign Up</a></li>
        </ul>
        <button class="hamburger sm:hidden" aria-label="Open menu">
            <span class="bar"></span><span class="bar"></span><span class="bar"></span>
        </button>
    </nav>`;

    const header = document.querySelector('.main-header');
    if (header) {
        header.innerHTML = headerHTML;
        attachNavEvents();
        updateAuthLink();
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
                    const userDoc = await db.collection("users").doc(user.uid).get();
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
