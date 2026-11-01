import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Expo config, formerly `app.json`.
 *
 * Adds the identifiers required for EAS builds and the native capabilities the
 * v1 feature set depends on. Values that are still owned by later PRs (audio)
 * are called out inline so the plugin list does not drift from what is actually
 * installed — a config plugin for a missing package breaks `expo config` /
 * prebuild.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'othman',
  slug: 'kuttab-othman',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'othman',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/images/icon.png',
    bundleIdentifier: 'com.kuttab.othman',
    supportsTablet: true,
    // Audio playback with the screen locked (P6.1). Declaring the mode before
    // the player exists is intentional: it is an Info.plist entry, so it has to
    // be present in the first dev client build.
    infoPlist: {
      UIBackgroundModes: ['audio'],
    },
    config: {
      // No custom/export-grade cryptography; skips the App Store Connect prompt.
      usesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.kuttab.othman',
    adaptiveIcon: {
      backgroundColor: '#FFFFFF',
      foregroundImage: './assets/images/icon.png',
    },
    // Kept off deliberately: the Quran reader owns horizontal swipe gestures
    // (page turns start at the screen edge), and Android's predictive-back
    // gesture would steal those touches before the reader sees them.
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    // Re-exported by expo-audio as a required native peer; without the plugin,
    // release builds can fail to resolve bundled audio assets.
    'expo-asset',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#003B24',
        image: './assets/brand/quranReaderLandingLogo-light.png',
        imageWidth: 120,
      },
    ],
    'expo-localization',
    'expo-web-browser',
    // Embedding the fonts means native builds have them before the first frame;
    // `src/providers/font-provider.tsx` still awaits `useFonts`, which is what
    // covers web and what the splash gate waits on.
    [
      'expo-font',
      {
        fonts: [
          './assets/fonts/Inter-Variable.ttf',
          './assets/fonts/NotoNaskhArabic-Variable.ttf',
          './assets/fonts/AmiriQuran-Regular.ttf',
        ],
      },
    ],
    // Playback only: the reader never records, so the microphone permission
    // and Android `RECORD_AUDIO` are explicitly off. Background playback is
    // what the audio session promises when the screen turns off.
    [
      'expo-audio',
      {
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundPlayback: true,
      },
    ],
    [
      'expo-image-picker',
      {
        // Only the library is used (profile photo); the camera and microphone
        // are not, so their permission strings are deliberately absent.
        photosPermission:
          'Allow Othman to choose a photo for your profile picture.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    ...config.extra,
    router: {},
    eas: {
      projectId: '7bae1fa7-cdda-4112-8029-938fa812e0ec',
    },
  },
  owner: 'jelkarchis-team',
});
