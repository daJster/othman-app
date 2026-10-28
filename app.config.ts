import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Expo config, formerly `app.json`.
 *
 * Adds the identifiers required for EAS builds and the native capabilities the
 * v1 feature set depends on. Values that are still owned by later PRs (fonts,
 * audio, image picker) are called out inline so the plugin list does not drift
 * from what is actually installed — a config plugin for a missing package
 * breaks `expo config` / prebuild.
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
    icon: './assets/expo.icon',
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
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
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
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
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
    // expo-audio (P6.1) and expo-image-picker (P4.3) add their plugins when the
    // packages are installed.
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
