import { jest } from '@jest/globals';
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextDecoder, TextEncoder });

global.firebase = {
  apps: [],
  initializeApp: jest.fn(),
  app: jest.fn(),
  auth: () => ({
    onAuthStateChanged: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn()
  }),
  firestore: () => ({
    settings: jest.fn(),
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        onSnapshot: jest.fn()
      }))
    }))
  }),
  functions: () => ({
    httpsCallable: jest.fn()
  })
};

