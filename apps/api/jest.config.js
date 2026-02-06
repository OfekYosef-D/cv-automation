/** @type {import("jest").Config} */
const config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testMatch: ["<rootDir>/src/**/*.(spec|test).ts"],
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  testEnvironment: "node",
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  moduleNameMapper: {
    "^jose$": "<rootDir>/test/__mocks__/jose.ts"
  }
};

module.exports = config;
