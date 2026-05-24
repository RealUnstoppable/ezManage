import { jest } from "@jest/globals";

global.window = global.window || {};
global.firebase = {
    apps: [],
    initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
    auth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
    firestore: jest.fn(() => ({ collection: jest.fn() }))
};
global.window.firebase = global.firebase;

describe('Firebase Initialization', () => {
  let auth, db;

  beforeAll(async () => {
    document.getElementById = jest.fn((id) => null);
    const authModule = await import("../auth.js");
    auth = authModule.auth;
    db = authModule.db;
  });

  it('should call getAuth', () => {
    expect(global.firebase.auth).toHaveBeenCalled();
  });

  it('should call getFirestore', () => {
    expect(global.firebase.firestore).toHaveBeenCalled();
  });
});
