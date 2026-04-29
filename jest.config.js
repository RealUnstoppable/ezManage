module.exports = {
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^https://www.gstatic.com/firebasejs/(.*)$': '<rootDir>/__mocks__/firebase.js'
  },
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
};
