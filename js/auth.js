// js/auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBgrI9HwJPSc5b4pu2Egsv4DE7shNwptSw",
  authDomain: "dts-hub-website.firebaseapp.com",
  projectId: "dts-hub-website",
  storageBucket: "dts-hub-website.firebasestorage.app",
  messagingSenderId: "48345990988",
  appId: "1:48345990988:web:e3662c9b508168546471e9",
  measurementId: "G-ZN3YJPHVGX"
};

// Initialize Firebase and export the instances for other scripts to use
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Admin status is verified securely via Firebase Custom Claims or Firestore User Data
const ADMIN_EMAIL = null;

onAuthStateChanged(auth, async (user) => {
    const authLink = document.getElementById('auth-link');
    const membershipStatusContainer = document.getElementById('membership-status-container');

    if (user) {
        // User is signed in
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            const destination = userData.isAdmin ? 'admin.html' : 'account.html';

            if (authLink) {
                authLink.href = destination;
                authLink.textContent = "My Account";
            }

            if (membershipStatusContainer) {
                membershipStatusContainer.innerHTML = `<span class="membership-status ${userData.membershipLevel}">${userData.membershipLevel}</span>`;
            }
        }
    } else {
        // User is signed out
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
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, "users", userCredential.user.uid), {
                    username: username || "User",
                    email: email, // FIX: Use the local variable directly instead of the credential object
                    signupDate: serverTimestamp(),
                    isBanned: false,
                    isAdmin: false, 
                    membershipLevel: 'free'
                });
                sessionStorage.setItem('newUser', 'true');
                window.location.replace('account.html');
            } catch (error) {
                showMessage(getFirebaseErrorMessage(error));
                submitBtn.disabled = false;
            }
        } else {
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));

                if (userDoc.exists() && !userDoc.data().isBanned) {
                    const destination = userDoc.data().isAdmin ? 'admin.html' : 'account.html';
                    window.location.replace(destination);
                } else {
                    await signOut(auth);
                    showMessage("This account is suspended or does not exist.");
                    submitBtn.disabled = false;
                }
            } catch (error) {
                showMessage(getFirebaseErrorMessage(error));
                submitBtn.disabled = false;
            }
        }
    });

    function getFirebaseErrorMessage(error) {
        switch (error.code) {
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'Invalid email or password.';
            case 'auth/email-already-in-use':
                return 'An account with this email already exists.';
            case 'auth/weak-password':
                return 'Password should be at least 6 characters.';
            default:
                return 'An unexpected error occurred. Please try again.';
        }
    }

    function showMessage(msg) { messageEl.textContent = msg; }
    updateFormView();
}