module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js$': '<rootDir>/__mocks__/firebase-app.js',
    '^https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js$': '<rootDir>/__mocks__/firebase-auth.js',
    '^https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js$': '<rootDir>/__mocks__/firebase-firestore.js',
  }
export default {
  testEnvironment: 'jsdom',
  transform: {}
};
