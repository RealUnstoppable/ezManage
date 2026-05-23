export default {
  testEnvironment: 'jsdom',
  transform: {},
  moduleNameMapper: {
    '^https://www.gstatic.com/firebasejs/(.*)$': '<rootDir>/__mocks__/firebase.js'
  },
  setupFiles: ['<rootDir>/tests/jest.setup.js'],
  rootDir: '.',
  roots: ['<rootDir>/tests']
};
