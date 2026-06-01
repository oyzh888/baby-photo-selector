module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    // Stub out native/Expo modules that are ES-only and not available in Jest/Node
    'expo-image-manipulator': '<rootDir>/__mocks__/expo-image-manipulator.js',
    'fast-png': '<rootDir>/__mocks__/fast-png.js',
  },
};
