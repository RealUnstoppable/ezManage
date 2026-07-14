const firebaseConfig = {
    apiKey: "AIzaSyBgrI9HwJPSc5b4pu2Egsv4DE7shNwptSw",
    authDomain: "ezmanage.realunstoppable.store",
    projectId: "dts-hub-website",
    storageBucket: "dts-hub-website.firebasestorage.app",
    messagingSenderId: "48345990988",
    appId: "1:48345990988:web:e3662c9b508168546471e9",
    measurementId: "G-ZN3YJPHVGX"
};

// Ensure Firebase is initialized strictly as a global singleton using the compat SDK
// to prevent token mismatches and duplicate initialization errors.
const app = !window.firebase.apps.length ? window.firebase.initializeApp(firebaseConfig) : window.firebase.app();

const auth = window.firebase.auth();

// Use experimentalForceLongPolling for fallback on CORS/network issues
window.firebase.firestore().settings({
    experimentalForceLongPolling: true
});

const db = window.firebase.firestore();
const functions = window.firebase.functions();

export { app, auth, db, functions, firebaseConfig };
