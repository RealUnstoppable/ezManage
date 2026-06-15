import { jest } from '@jest/globals';

window.firebase = {
  apps: [{
    name: '[DEFAULT]'
  }],
  initializeApp: jest.fn(),
  auth: () => ({
    onAuthStateChanged: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn()
  }),
  firestore: () => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        onSnapshot: jest.fn()
      }))
    }))
  })
};

import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextDecoder, TextEncoder });

global.firebase = window.firebase;
globalThis.firebase = window.firebase;
