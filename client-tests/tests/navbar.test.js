import { jest } from "@jest/globals";

global.window = global.window || {};

const mockOnAuthStateChanged = jest.fn();

global.window.firebase = {
    apps: [],
    initializeApp: jest.fn(),
    auth: jest.fn(() => ({
        onAuthStateChanged: mockOnAuthStateChanged
    })),
    firestore: jest.fn(() => ({
        collection: jest.fn(() => ({
            doc: jest.fn(() => ({
                get: jest.fn()
            }))
        })),
        settings: jest.fn()
    }))
};

global.firebase = global.window.firebase;

jest.unstable_mockModule('../../js/auth.js', () => ({
  auth: {
      onAuthStateChanged: mockOnAuthStateChanged
  },
  db: {
      settings: jest.fn(),
      collection: jest.fn(() => ({
          doc: jest.fn(() => ({
              get: jest.fn()
          }))
      }))
  },
  getUserRedirectPath: (userData) => userData && userData.isAdmin ? 'admin.html' : 'index.html'
}));

const authModule = await import('../../js/auth.js');
const { loadNavbar } = await import('../../js/navbar.js');

describe('loadNavbar', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="main-header"></div>';
    jest.clearAllMocks();
  });

  it('should inject navbar HTML', async () => {
    await loadNavbar();
    expect(document.querySelector('.navbar')).not.toBeNull();
  });

  it('should set auth link to index.html if user is logged in but not admin', async () => {
    await loadNavbar();
    const mockUser = { uid: '123' };

    const mockDoc = {
      exists: true,
      data: () => ({ isAdmin: false })
    };

    authModule.db.collection = jest.fn(() => ({
        doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue(mockDoc)
        }))
    }));

    const onAuthCall = mockOnAuthStateChanged.mock.calls[0][0];

    await onAuthCall(mockUser);

    const authLink = document.getElementById('auth-link');
    expect(authLink.textContent).toBe('My Account');
    expect(authLink.href).toContain('index.html');
  });
});
