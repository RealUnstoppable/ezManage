window.firebase = {
    apps: [],
    initializeApp: () => {},
    auth: () => ({ onAuthStateChanged: () => {} }),
    firestore: () => ({})
};
global.firebase = window.firebase;
