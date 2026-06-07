/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', { configFile: './babel.config.test.js' }],
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'ConnectB2B — Laporan Automated Testing (FR-01..FR-29)',
        outputPath: '<rootDir>/test-report.html',
        includeFailureMsg: true,
        includeConsoleLog: false,
        sort: 'titleAsc',
        theme: 'defaultTheme',
      },
    ],
  ],
};

module.exports = config;
