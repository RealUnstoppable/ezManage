import { jest } from "@jest/globals";

const mockSettings = jest.fn();

global.window = global.window || {};
global.firebase = {
    apps: [],
    initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
    app: jest.fn(),
    auth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
    firestore: jest.fn(() => ({ collection: jest.fn(), settings: mockSettings }))
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

  it('should initialize firebase app only once', () => {
      expect(global.window.firebase.initializeApp).toHaveBeenCalledTimes(1);
  });

  it('should call firestore settings with experimentalForceLongPolling', () => {
      expect(mockSettings).toHaveBeenCalledWith({ experimentalForceLongPolling: true });
  });

  it('should call getAuth', () => {
    expect(global.firebase.auth).toHaveBeenCalled();
  });

  it('should call getFirestore', () => {
    expect(global.firebase.firestore).toHaveBeenCalled();
  });
});
