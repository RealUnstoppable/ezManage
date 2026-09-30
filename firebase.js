const firebaseConfig = window.ezManageFirebaseConfig || {
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
// Use experimentalForceLongPolling for fallback on CORS/network issues
if (!window.firebase.apps.length) {
    window.firebase.initializeApp(firebaseConfig);
    window.firebase.firestore().settings({
        experimentalForceLongPolling: true
    });
}

// INSTRUCTIONS FOR AUTHORIZED DOMAINS:
// To whitelist `ezmanage.realunstoppable.store` in the Firebase Console:
// 1. Go to Authentication -> Settings -> Authorized domains
// 2. Click "Add domain" and enter `ezmanage.realunstoppable.store`
// Note: Firestore rules are handled via firestore.rules file deployment.

const auth = window.firebase.auth();

// Use experimentalForceLongPolling for fallback on CORS/network issues
try {
    window.firebase.firestore().settings({
        experimentalForceLongPolling: true
    });
} catch (e) {
    console.warn("Firestore settings already configured or errored: ", e);
}

const db = window.firebase.firestore();
const functions = window.firebase.functions();

export { auth, db, functions, firebaseConfig };
