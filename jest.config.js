/* eslint-disable unicorn/prefer-module */
/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  // on slow windows machine with HDD, some test will timeout.
  testTimeout: 30_000,
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['jest-extended/all', './test/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
