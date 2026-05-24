export default { testEnvironment: 'jsdom', transform: {}, moduleNameMapper: { '^https://www.gstatic.com/firebasejs/(.*)$': '<rootDir>/__mocks__/firebase.js' }, rootDir: '.', roots: ['<rootDir>/tests'], setupFiles: ['<rootDir>/__mocks__/setup.js'] };
export default {
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transform: {},
  moduleNameMapper: {
    '^https://www.gstatic.com/firebasejs/(.*)$': '<rootDir>/__mocks__/firebase.js'
  },
  setupFiles: ['<rootDir>/tests/jest.setup.js'],
  rootDir: '.',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
