import { logManagerError } from './utils.js';

import { auth, db, onAuthStateChanged, doc, getDoc } from './auth.js';

(function() {
    const localTheme = localStorage.getItem('userTheme');
    const localAccent = localStorage.getItem('userAccent');
    if (localTheme) document.body.dataset.theme = localTheme;
    if (localAccent) document.body.dataset.accent = localAccent;
})();

export const applyTheme = (theme, accentColor) => {
    document.body.dataset.theme = theme || 'dark';
    document.body.dataset.accent = accentColor || 'blue';

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

                applyTheme('dark', 'blue');
            }
        } catch (error) {
            logManagerError("Error loading theme from Firestore:", error);
            applyTheme('dark', 'blue');
        }
    } else {
        try {
            const localTheme = localStorage.getItem('userTheme');
            const localAccent = localStorage.getItem('userAccent');
            applyTheme(localTheme, localAccent);
        } catch (error) {
            logManagerError("Error reading local storage for theme:", error);
            applyTheme('dark', 'blue');
        }
    }
});

window.updateTheme = applyTheme;