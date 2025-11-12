const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  transform: {
    ...tsJestTransformCfg,
  },
  testMatch: [
    "**/?(*.)+(test|spec|int.test|e2e.test|e2e.spec).ts"
  ],
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
  setupFilesAfterEnv: [
    "<rootDir>/test/setup.ts",
    "<rootDir>/jest.setup.js"  
  ],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/data/migrations/**",  // Exclude migrations from coverage
    "!src/**/*.d.ts",            // Exclude type definitions
  ],
  globals: {
    "ts-jest": {
      isolatedModules: true,
    },
  },
};

