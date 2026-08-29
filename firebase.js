const getEnv = (key, fallback) => typeof process !== 'undefined' && process.env && process.env[key] ? process.env[key] : fallback;

const firebaseConfig = {
    apiKey: getEnv('REACT_APP_FIREBASE_API_KEY', "AIzaSyBgrI9HwJPSc5b4pu2Egsv4DE7shNwptSw"),
    authDomain: getEnv('REACT_APP_FIREBASE_AUTH_DOMAIN', "ezmanage.realunstoppable.store"),
    projectId: getEnv('REACT_APP_FIREBASE_PROJECT_ID', "dts-hub-website"),
    storageBucket: getEnv('REACT_APP_FIREBASE_STORAGE_BUCKET', "dts-hub-website.firebasestorage.app"),
    messagingSenderId: getEnv('REACT_APP_FIREBASE_MESSAGING_SENDER_ID', "48345990988"),
    appId: getEnv('REACT_APP_FIREBASE_APP_ID', "1:48345990988:web:e3662c9b508168546471e9"),
    measurementId: getEnv('REACT_APP_FIREBASE_MEASUREMENT_ID', "G-ZN3YJPHVGX")
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
