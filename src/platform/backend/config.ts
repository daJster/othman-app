import { Platform } from 'react-native';

/**
 * Mock backend location + feature flag.
 *
 * The flag is read from an `EXPO_PUBLIC_` variable so Metro inlines it into the
 * bundle. `npm run dev` sets it and starts the server alongside Metro; `npm start`
 * alone keeps the app on its offline fixtures, so the two modes never disagree
 * by accident.
 */

export const BACKEND_PORT = 9000;

export const MOCK_BACKEND_ENABLED =
  process.env.EXPO_PUBLIC_MOCK_BACKEND === '1' ||
  process.env.EXPO_PUBLIC_MOCK_BACKEND === 'true';

/**
 * Where the API lives from the app's point of view.
 *
 * - web: `localhost` (same machine as Metro)
 * - Android emulator: `10.0.2.2` is the host loopback; `localhost` is the
 *   emulator itself, which is the classic "connection refused" trap
 * - iOS simulator: `localhost` works
 * - physical device: set `EXPO_PUBLIC_MOCK_API_URL=http://<lan-ip>:9000`
 */
export function backendBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_MOCK_API_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${BACKEND_PORT}`;
  }

  return `http://localhost:${BACKEND_PORT}`;
}
