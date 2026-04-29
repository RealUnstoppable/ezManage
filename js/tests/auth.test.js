import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

describe('Firebase Initialization', () => {
  let app, auth, db;

  beforeAll(async () => {
    // Mock document.getElementById before dynamic import
    document.getElementById = jest.fn((id) => null);

    // Dynamic import to ensure the mock is in place before the module is evaluated
    const authModule = await import("../auth.js");
    app = authModule.app;
    auth = authModule.auth;
    db = authModule.db;
  });

  it('should call initializeApp with correct config', () => {
    // The measurementId is present in some environments, but we only assert properties we know for sure are in all configs (like apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
    expect(initializeApp).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: expect.any(String),
      authDomain: expect.any(String),
      projectId: expect.any(String),
      storageBucket: expect.any(String),
      messagingSenderId: expect.any(String),
      appId: expect.any(String)
    }));
  });

  it('should call getAuth with the app instance', () => {
    expect(getAuth).toHaveBeenCalledWith(app);
  });

  it('should call getFirestore with the app instance', () => {
    expect(getFirestore).toHaveBeenCalledWith(app);
  });
});
