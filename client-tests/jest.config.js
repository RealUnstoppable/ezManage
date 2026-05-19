export default {
  testEnvironment: 'jsdom',
  transform: {},
  moduleNameMapper: {
    '^https://www.gstatic.com/firebasejs/(.*)$': '<rootDir>/__mocks__/firebase.js'
  },
  rootDir: '.',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
