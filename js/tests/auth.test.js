import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

describe('Firebase Initialization', () => {
  let app, auth, db;

  beforeAll(async () => {

    document.getElementById = jest.fn((id) => null);

    const authModule = await import("../auth.js");
    app = authModule.app;
    auth = authModule.auth;
    db = authModule.db;
  });

  it('should call initializeApp with correct config', () => {

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
