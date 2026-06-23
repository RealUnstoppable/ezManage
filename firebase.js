const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBgrI9HwJPSc5b4pu2Egsv4DE7shNwptSw",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "ezmanage.realunstoppable.store",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "dts-hub-website",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "dts-hub-website.firebasestorage.app",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "48345990988",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:48345990988:web:e3662c9b508168546471e9",
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-ZN3YJPHVGX"
};

// Ensure Firebase is initialized strictly as a global singleton using the compat SDK
// to prevent token mismatches and duplicate initialization errors.
const app = !window.firebase.apps.length ? window.firebase.initializeApp(firebaseConfig) : window.firebase.app();

// Use experimentalForceLongPolling for fallback on CORS/network issues
// Must be called exactly once immediately after init and BEFORE any other references
if (!window.firebase.apps.length || window.firebase.firestore()._settingsfrozen !== true) {
    window.firebase.firestore().settings({
        experimentalForceLongPolling: true
    });
    window.firebase.firestore()._settingsfrozen = true;
}

const auth = window.firebase.auth();
const db = window.firebase.firestore();
const functions = window.firebase.functions();

export { app, auth, db, functions, firebaseConfig };
