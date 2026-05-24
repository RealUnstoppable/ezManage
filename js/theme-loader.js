
(function() {
    const localTheme = localStorage.getItem('userTheme');
    const localAccent = localStorage.getItem('userAccent');
    if (localTheme) document.body.dataset.theme = localTheme;
    if (localAccent) document.body.dataset.accent = localAccent;
})();
import { auth, db, onAuthStateChanged, doc, getDoc } from './auth.js';

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
            console.error("Manager Troubleshooting: Error loading theme from Firestore:", error);
            applyTheme('dark', 'blue');
        }
    } else {

        const localTheme = localStorage.getItem('userTheme');
        const localAccent = localStorage.getItem('userAccent');
        applyTheme(localTheme, localAccent);
    }
});

window.updateTheme = applyTheme;