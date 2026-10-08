import { jest } from "@jest/globals";

const mockSettings = jest.fn();

global.window = global.window || {};
global.firebase = {
    apps: [],
    initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
    app: jest.fn(),
    auth: jest.fn(() => ({ onAuthStateChanged: jest.fn() })),
    firestore: jest.fn(() => ({ collection: jest.fn(), settings: mockSettings })),
    functions: jest.fn(() => ({ httpsCallable: jest.fn() }))
};
global.window.firebase = global.firebase;
global.window.firebase.firestore = jest.fn(() => ({ collection: jest.fn(), settings: mockSettings }));
global.firebase.firestore = global.window.firebase.firestore;

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

describe('getUserRedirectPath', () => {
    let getUserRedirectPath;

    beforeAll(async () => {
        const authModule = await import("../auth.js");
        getUserRedirectPath = authModule.getUserRedirectPath;
    });

    it('should return "admin.html" if user data exists and isAdmin is true', () => {
        const result = getUserRedirectPath({ isAdmin: true });
        expect(result).toBe('admin.html');
    });

    it('should return "index.html" if user data exists and isAdmin is false', () => {
        const result = getUserRedirectPath({ isAdmin: false });
        expect(result).toBe('index.html');
    });

    it('should return "index.html" if user data exists but isAdmin is not defined', () => {
        const result = getUserRedirectPath({ someOtherField: true });
        expect(result).toBe('index.html');
    });

    it('should return "index.html" if user data is null', () => {
        const result = getUserRedirectPath(null);
        expect(result).toBe('index.html');
    });

    it('should return "index.html" if user data is undefined', () => {
        const result = getUserRedirectPath(undefined);
        expect(result).toBe('index.html');
    });
});
