import { jest } from '@jest/globals';
global.firebase = {
  apps: [],
  initializeApp: jest.fn(),
  auth: () => ({
    onAuthStateChanged: jest.fn()
  }),
  firestore: () => ({})
};
window.firebase = global.firebase;
