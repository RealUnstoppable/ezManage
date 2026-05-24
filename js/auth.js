import { getFirebaseErrorMessage } from './utils/errorUtils.js';

if (!window.firebase) { console.error("Firebase Compat SDK must be loaded before auth.js"); }

export const auth = window.firebase ? window.firebase.auth() : {};
export const db = window.firebase ? window.firebase.firestore() : {};

export function getUserRedirectPath(userData) {
    return userData && userData.isAdmin ? 'admin.html' : 'index.html';
}

const ADMIN_EMAIL = null;

if (auth.onAuthStateChanged) {
auth.onAuthStateChanged(async (user) => {
    const authLink = document.getElementById('auth-link');
    const membershipStatusContainer = document.getElementById('membership-status-container');

    if (user) {

        try {
            const userDocRef = db.collection("users").doc(user.uid);
            const userDoc = await userDocRef.get();

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
            console.error("Error fetching user document in auth state change:", error);
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
                    signupDate: firebase.firestore.FieldValue.serverTimestamp()
                });
                sessionStorage.setItem('newUser', 'true');
                window.location.replace('index.html');
            } catch (error) {
                console.error("Manager Troubleshooting: Sign up error for email:", email, error);
                showMessage(getFirebaseErrorMessage(error));
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
                console.error("Manager Troubleshooting: Sign in error for email:", email, error);
                showMessage(getFirebaseErrorMessage(error));
                submitBtn.disabled = false;
            }
        }
    });

    function showMessage(msg) { messageEl.textContent = msg; }
    updateFormView();
}
