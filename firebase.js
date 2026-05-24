import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBgrI9HwJPSc5b4pu2Egsv4DE7shNwptSw",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "dts-hub-website.firebaseapp.com",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "dts-hub-website",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "dts-hub-website.firebasestorage.app",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "48345990988",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:48345990988:web:e3662c9b508168546471e9",
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-ZN3YJPHVGX"
};

// Ensure Firebase is initialized exactly once as a singleton to prevent token mismatches
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);

// Use experimentalForceLongPolling for fallback on CORS/network issues
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true
});

const functions = getFunctions(app);

export { app, auth, db, functions };
