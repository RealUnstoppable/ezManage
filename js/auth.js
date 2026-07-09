import { getFirebaseErrorMessage, logManagerError } from './utils.js';



const firebaseConfig = {
  apiKey: "AIzaSyBgrI9HwJPSc5b4pu2Egsv4DE7shNwptSw",
  authDomain: "ezmanage.realunstoppable.store",
  projectId: "dts-hub-website",
  storageBucket: "dts-hub-website.firebasestorage.app",
  messagingSenderId: "48345990988",
  appId: "1:48345990988:web:e3662c9b508168546471e9",
  measurementId: "G-ZN3YJPHVGX"
};

if (!window.firebase) { console.error("Firebase Compat SDK must be loaded before auth.js"); }

export const auth = window.firebase ? window.firebase.auth() : {};
export const db = window.firebase ? window.firebase.firestore() : {};

export function getUserRedirectPath(userData) {
    return userData && userData.isAdmin ? 'admin.html' : 'index.html';
}

export async function fetchUserDoc(uid) {
    try {
        return await db.collection("users").doc(uid).get();
    } catch (error) {
        logManagerError("Error fetching user document in fetchUserDoc for uid: " + uid, error);
        throw error;
    }
}

const ADMIN_EMAIL = null;

if (auth && auth.onAuthStateChanged) {
auth.onAuthStateChanged(async (user) => {
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
                    membershipStatusContainer.innerHTML = `<span class="membership-status ${level}">${level}</span>`;
                }
            }
        } catch (error) {
            logManagerError("Error fetching user document in auth state change for uid: " + user.uid, error);
        }
    } else {
        if (authLink) {
            authLink.href = 'sign in beta.html';
            authLink.textContent = "Sign In / Sign Up";
        }
        if (membershipStatusContainer) {
            membershipStatusContainer.innerHTML = '';
        }
    }
});

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
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const username = document.getElementById('username').value.trim();

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
                sessionStorage.setItem('newUser', 'true');
                window.location.replace('index.html');
            } catch (error) {
                logManagerError("Sign up error for email: " + email, error);
                if (error.code === 'auth/network-request-failed' || error.code === 'unavailable') {
                    showMessage("Network error: Please check your connection or whitelist our domain.");
                } else {
                    showMessage(getFirebaseErrorMessage(error));
                }
                submitBtn.disabled = false;
            }
        } else {
            try {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const userDoc = await db.collection("users").doc(userCredential.user.uid).get();

                if (userDoc.exists && userDoc.data().isBanned !== true) {
                    const destination = getUserRedirectPath(userDoc.data());
                    window.location.replace(destination);
                } else {
                    await auth.signOut();
                    showMessage("This account is suspended or does not exist.");
                    submitBtn.disabled = false;
                }
            } catch (error) {
                logManagerError("Sign in error for email: " + email, error);
                if (error.code === 'auth/network-request-failed' || error.code === 'unavailable') {
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
}