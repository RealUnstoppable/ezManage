// js/theme-loader.js
(function() {
    const localTheme = localStorage.getItem('userTheme');
    const localAccent = localStorage.getItem('userAccent');
    if (localTheme) document.body.dataset.theme = localTheme;
    if (localAccent) document.body.dataset.accent = localAccent;
})();
import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const applyTheme = (theme, accentColor) => {
    document.body.dataset.theme = theme || 'dark';
    document.body.dataset.accent = accentColor || 'blue';

    // Persist theme for non-logged-in users
    if (!auth.currentUser) {
        localStorage.setItem('userTheme', document.body.dataset.theme);
        localStorage.setItem('userAccent', document.body.dataset.accent);
    }
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                const userData = userDoc.data();
                applyTheme(userData.theme, userData.accentColor);
            } else {
                // Fallback for new users or data not found
                applyTheme('dark', 'blue');
            }
        } catch (error) {
            console.error("Error loading theme from Firestore:", error);
            applyTheme('dark', 'blue');
        }
    } else {
        // Load theme from localStorage for guests
        const localTheme = localStorage.getItem('userTheme');
        const localAccent = localStorage.getItem('userAccent');
        applyTheme(localTheme, localAccent);
    }
});

// Expose a function to be called from the account page for instant theme updates
window.updateTheme = applyTheme;