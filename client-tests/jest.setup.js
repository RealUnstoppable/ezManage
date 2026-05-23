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
global.firebase = {
  apps: [],
  initializeApp: jest.fn(),
  auth: () => ({
    onAuthStateChanged: jest.fn()
  }),
  firestore: () => ({})
};
window.firebase = global.firebase;
