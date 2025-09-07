import type { Config } from 'jest';

const config: Config = {
  displayName: 'server-simple',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testMatch: ['<rootDir>/tests/unit/eventSystem.test.ts'],
  // Skip database setup for simple tests
  moduleNameMapper: {
    // Redirect @ems/types imports to TS source for ts-jest compilation
    '^@ems/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@ems/types/(.*)$': '<rootDir>/../../packages/types/src/$1.ts',
  },
};

export default config;
