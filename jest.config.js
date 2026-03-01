export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    '*.js',
    'utils/**/*.js',
    '!index.js',
    '!jest.config.js',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
  transformIgnorePatterns: ['/node_modules/'],
  transform: {},
};
