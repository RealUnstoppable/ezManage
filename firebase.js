const getEnv = (key, fallback) => typeof process !== 'undefined' && process.env && process.env[key] ? process.env[key] : fallback;

const firebaseConfig = typeof window !== 'undefined' && window.ezManageFirebaseConfig ? window.ezManageFirebaseConfig : {
    apiKey: getEnv('REACT_APP_FIREBASE_API_KEY', "AIzaSyBgrI9HwJPSc5b4pu2Egsv4DE7shNwptSw"),
    authDomain: getEnv('REACT_APP_FIREBASE_AUTH_DOMAIN', "dts-hub-website.firebaseapp.com"),
    projectId: getEnv('REACT_APP_FIREBASE_PROJECT_ID', "dts-hub-website"),
    storageBucket: getEnv('REACT_APP_FIREBASE_STORAGE_BUCKET', "dts-hub-website.firebasestorage.app"),
    messagingSenderId: getEnv('REACT_APP_FIREBASE_MESSAGING_SENDER_ID', "48345990988"),
    appId: getEnv('REACT_APP_FIREBASE_APP_ID', "1:48345990988:web:e3662c9b508168546471e9"),
    measurementId: getEnv('REACT_APP_FIREBASE_MEASUREMENT_ID', "G-ZN3YJPHVGX")
};

// Ensure Firebase is initialized strictly as a global singleton using the compat SDK
// to prevent token mismatches and duplicate initialization errors.
// Use experimentalForceLongPolling for fallback on CORS/network issues
let app = null;
if (typeof window !== "undefined" && window.firebase) {
    if (!window.firebase.apps.length) {
        app = window.firebase.initializeApp(firebaseConfig);
    } else {
        app = window.firebase.app();
    }
    try {
        window.firebase.firestore().settings({
            experimentalForceLongPolling: true
        });
    } catch (e) {
        console.warn("Firestore settings already configured or errored: ", e);
    }
    try {
        if (window.firebase.auth && window.firebase.auth.Auth && window.firebase.auth.Auth.Persistence) {
            window.firebase.auth().setPersistence(window.firebase.auth.Auth.Persistence.LOCAL).catch(e => {
                console.warn("Auth persistence setup notice:", e);
            });
        }
    } catch (e) {
        console.warn("Auth persistence error:", e);
    }
}

// INSTRUCTIONS FOR AUTHORIZED DOMAINS:
// To whitelist `ezmanage.realunstoppable.store` in the Firebase Console:
// 1. Go to Authentication -> Settings -> Authorized domains
// 2. Click "Add domain" and enter `ezmanage.realunstoppable.store`
// Note: Firestore rules are handled via firestore.rules file deployment.

// 🛡️ Firebase App Check Configuration (Protection against abuse & unverified clients)
let appCheck = null;
if (typeof window !== "undefined" && window.firebase && window.firebase.appCheck) {
    try {
        if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
            self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        }
        appCheck = window.firebase.appCheck();
        // Activate App Check with reCAPTCHA v3 or Debug provider
        if (typeof appCheck.activate === 'function') {
            appCheck.activate(
                window.ezManageAppCheckSiteKey || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
                true
            );
        }
    } catch (e) {
        console.warn("Firebase App Check initialization notice: ", e.message);
    }
}

const db = typeof window !== "undefined" && window.firebase && typeof window.firebase.firestore === "function" ? window.firebase.firestore() : null;
const functions = typeof window !== "undefined" && window.firebase && typeof window.firebase.functions === "function" ? window.firebase.functions() : null;
const auth = typeof window !== "undefined" && window.firebase && typeof window.firebase.auth === "function" ? window.firebase.auth() : null;
export { app, auth, db, functions, appCheck, firebaseConfig };
