const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBgrI9HwJPSc5b4pu2Egsv4DE7shNwptSw",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "dts-hub-website.firebaseapp.com",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "dts-hub-website",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "dts-hub-website.firebasestorage.app",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "48345990988",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:48345990988:web:e3662c9b508168546471e9",
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-ZN3YJPHVGX"
};

const app = typeof window !== 'undefined' && window.firebase
    ? (!window.firebase.apps.length ? window.firebase.initializeApp(firebaseConfig) : window.firebase.app())
    : null;

const auth = app ? window.firebase.auth() : null;

const db = app ? window.firebase.firestore() : null;
if (db && db.settings) {
    db.settings({ experimentalForceLongPolling: true });
}
const functions = app ? window.firebase.functions() : null;

export { app, auth, db, functions, firebaseConfig };
