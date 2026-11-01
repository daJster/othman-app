/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  rootDir: __dirname,
  // The legacy Vite app is reference material, not test surface. `dist`/`dist-*`
  // are build output.
  testPathIgnorePatterns: [
    '/node_modules/',
    '/othman-web/',
    '/dist/',
    '/dist-android/',
    '/dist-ios/',
  ],
  // Uniwind compiles `className` in Metro, so in Jest it is an inert prop. Tests
  // therefore assert structure, text and behaviour — never computed styles.
  setupFiles: [
    '<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // `jest-expo` whitelists Expo/React Native packages for Babel but not Uniwind,
  // whose entry point is untranspiled ESM (`export * from …`). Adding it here
  // keeps `withUniwind` real in tests instead of mocking the whole library.
  // `react-native-svg` and `lucide-react-native` ship untranspiled ESM too.
  // Keep the preset's other two entries: they opt out of transforming the
  // Reanimated plugin and the React Native Babel preset.
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|uniwind|react-native-svg|lucide-react-native))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  // Lucide's `react-native` entry is `.mjs`, which the preset's `\.[jt]sx?$`
  // transform does not match. Compile those modules with the same Expo preset
  // so Jest sees CommonJS.
  transform: {
    '^.+\\.mjs$': [
      'babel-jest',
      {
        presets: ['babel-preset-expo'],
        caller: { name: 'metro', bundler: 'jest', platform: 'ios' },
      },
    ],
  },
};
