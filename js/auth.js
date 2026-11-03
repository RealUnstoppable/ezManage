import { getFirebaseErrorMessage, logManagerError, escapeHTML, isNetworkError, sanitizeInput } from './utils.js';

import { auth, db } from '../firebase.js';

export { auth, db };

export function getUserRedirectPath(userData) {
    if (!userData) return 'index.html';
    if (userData.email === 'catalinandrian1@gmail.com' || userData.role === 'CorporateAdmin' || userData.role === 'Creator') {
        return 'company.html';
    }
    return userData.isAdmin ? 'admin.html' : 'index.html';
}

const userDocCache = new Map(); // ⚡ Bolt Optimization: Cache user document fetches

export async function fetchUserDoc(uid) {
    // ⚡ Bolt Optimization: Cache user document fetches to prevent N+1 query bottlenecks on auth state change
    if (userDocCache.has(uid)) {
        return userDocCache.get(uid);
    }

    const fetchPromise = db.collection("users").doc(uid).get().catch(error => {
        logManagerError("Error fetching user document in fetchUserDoc for uid: " + uid, error);
        userDocCache.delete(uid); // Remove from cache on error so we can retry later
        throw error;
    });

    userDocCache.set(uid, fetchPromise);
    return fetchPromise;
}

// 🔒 Account Lockout Protection (Client Defense-in-Depth)
export const MAX_AUTH_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function checkAccountLockout(email) {
    if (!email || typeof window === 'undefined' || !window.localStorage) {
        return { isLocked: false, remainingSeconds: 0, attempts: 0 };
    }
    const cleanEmail = String(email).toLowerCase().trim();
    const stored = window.localStorage.getItem(`ezManage_lockout_${cleanEmail}`);
    if (!stored) return { isLocked: false, remainingSeconds: 0, attempts: 0 };

    try {
        const record = JSON.parse(stored);
        const now = Date.now();
        if (record.lockedUntil && record.lockedUntil > now) {
            const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
            return { isLocked: true, remainingSeconds, attempts: record.count };
        }
        return { isLocked: false, remainingSeconds: 0, attempts: record.count || 0 };
    } catch (e) {
        window.localStorage.removeItem(`ezManage_lockout_${cleanEmail}`);
    }
    return { isLocked: false, remainingSeconds: 0, attempts: 0 };
}

export function recordFailedAuth(email) {
    if (!email || typeof window === 'undefined' || !window.localStorage) return;
    const cleanEmail = String(email).toLowerCase().trim();
    const key = `ezManage_lockout_${cleanEmail}`;
    let record = { count: 0, lockedUntil: null, lastAttempt: Date.now() };

    try {
        const stored = window.localStorage.getItem(key);
        if (stored) record = JSON.parse(stored);
    } catch (e) {}

    const now = Date.now();
    if (record.lockedUntil && record.lockedUntil <= now) {
        record.count = 0;
        record.lockedUntil = null;
    }

    record.count = (record.count || 0) + 1;
    record.lastAttempt = now;

    if (record.count >= MAX_AUTH_ATTEMPTS) {
        record.lockedUntil = now + LOCKOUT_DURATION_MS;
    }

    window.localStorage.setItem(key, JSON.stringify(record));

    // Asynchronously inform backend watchdog if available
    try {
        if (typeof fetch !== 'undefined') {
            fetch('/api/security/auth-attempt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: cleanEmail, success: false })
            }).catch(() => {});
        }
    } catch (e) {}

    return record;
}

export function recordSuccessfulAuth(email) {
    if (!email || typeof window === 'undefined' || !window.localStorage) return;
    const cleanEmail = String(email).toLowerCase().trim();
    window.localStorage.removeItem(`ezManage_lockout_${cleanEmail}`);

    try {
        if (typeof fetch !== 'undefined') {
            fetch('/api/security/auth-attempt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: cleanEmail, success: true })
            }).catch(() => {});
        }
    } catch (e) {}
}




if (auth && auth.onAuthStateChanged) {
let currentUid = null;
let isDashboardLoaded = false;
auth.onAuthStateChanged(async (user) => {
    if (user && user.uid === currentUid && isDashboardLoaded) return;
    currentUid = user ? user.uid : null;
    isDashboardLoaded = true;
    const authLink = document.getElementById('auth-link');
    const membershipStatusContainer = document.getElementById('membership-status-container');

    if (user) {
        try {
            const userDoc = await fetchUserDoc(user.uid);
            if (userDoc.exists) {
                const userData = userDoc.data();
                const destination = getUserRedirectPath(userData);

                if (authLink) {
                    authLink.href = destination;
                    authLink.textContent = "My Account";
                }

                if (membershipStatusContainer) {
                    const level = userData.membershipLevel || 'free';
                    membershipStatusContainer.innerHTML = `<span class="membership-status ${escapeHTML(level)}">${escapeHTML(level)}</span>`;
                }
            }
        } catch (error) {
            logManagerError("Error fetching user document in auth state change for uid:", user.uid, error);
        }
    } else {
        if (authLink) {
            authLink.href = 'sign in beta.html';
            authLink.textContent = "Sign In / Sign Up";
        }
        if (membershipStatusContainer) {
            membershipStatusContainer.textContent = '';
        }
    }
});
}


if (document.getElementById('auth-form')) {
    const form = document.getElementById('auth-form');
    const formTitle = document.getElementById('form-title');
    const submitBtn = document.getElementById('submit-btn');
    const toggleLink = document.getElementById('toggle-form');
    const usernameGroup = document.getElementById('username-group');
    const messageEl = document.getElementById('message');

    let isSignUp = false;

    const updateFormView = () => {
        formTitle.textContent = isSignUp ? 'Sign Up' : 'Sign In';
        usernameGroup.style.display = isSignUp ? 'block' : 'none';
        document.getElementById('username').required = isSignUp;
        submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
        toggleLink.textContent = isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up";
        messageEl.textContent = '';
    };

    toggleLink.addEventListener('click', e => {
        e.preventDefault();
        isSignUp = !isSignUp;
        updateFormView();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rawEmail = document.getElementById('email').value.trim();
        const email = sanitizeInput(rawEmail).toLowerCase();
        const password = document.getElementById('password').value;
        const rawUsername = document.getElementById('username').value.trim();
        const username = escapeHTML(sanitizeInput(rawUsername));

        messageEl.textContent = '';
        submitBtn.disabled = true;

        if (isSignUp) {
            if (!username || !email || !password) {
                showMessage("All fields are required.");
                submitBtn.disabled = false;
                return;
            }
            try {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                await db.collection("users").doc(userCredential.user.uid).set({
                    username: username || "User",
                    email,
                    signupDate: window.firebase.firestore.FieldValue.serverTimestamp()
                });
                recordSuccessfulAuth(email);
                sessionStorage.setItem('newUser', 'true');
                window.location.replace('index.html');
            } catch (error) {
                logManagerError("Sign up error for email: " + email, error);
                if (isNetworkError(error)) {
                    showMessage("Network error: Please check your connection or whitelist our domain.");
                } else {
                    showMessage(getFirebaseErrorMessage(error));
                }
                submitBtn.disabled = false;
            }
        } else {
            // Check Account Lockout before attempting sign in
            const lockout = checkAccountLockout(email);
            if (lockout.isLocked) {
                const mins = Math.ceil(lockout.remainingSeconds / 60);
                showMessage(`Account temporarily locked due to repeated failed attempts. Please try again in ${mins} minute${mins === 1 ? '' : 's'}.`);
                submitBtn.disabled = false;
                return;
            }

            try {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const userDoc = await fetchUserDoc(userCredential.user.uid);

                if (userDoc.exists && userDoc.data().isBanned !== true) {
                    recordSuccessfulAuth(email);
                    const destination = getUserRedirectPath(userDoc.data());
                    window.location.replace(destination);
                } else {
                    await auth.signOut();
                    showMessage("This account is suspended or does not exist.");
                    submitBtn.disabled = false;
                }
            } catch (error) {
                logManagerError("Sign in error for email: " + email, error);
                const rec = recordFailedAuth(email);
                if (rec && rec.lockedUntil && rec.lockedUntil > Date.now()) {
                    showMessage(`Too many failed sign in attempts. Account temporarily locked for 15 minutes.`);
                } else if (isNetworkError(error)) {
                    showMessage("Network error: Please check your connection or whitelist our domain.");
                } else {
                    showMessage(getFirebaseErrorMessage(error));
                }
                submitBtn.disabled = false;
            }
        }
    });

    function showMessage(msg) { messageEl.textContent = msg; }
    updateFormView();
}
