import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/js-with-ts',
  projects: [
    '<rootDir>/apps/server/jest.config.ts',
    // later: '<rootDir>/apps/client/jest.config.ts'
  ],
};

export default config;
