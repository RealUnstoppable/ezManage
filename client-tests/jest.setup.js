import { jest } from '@jest/globals';
window.firebase = {
    apps: [],
    auth: () => ({
        onAuthStateChanged: jest.fn()
    }),
    firestore: jest.fn(),
    initializeApp: jest.fn()
};
global.firebase = window.firebase;
