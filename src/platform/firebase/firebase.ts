import { getApps, getApp, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

/**
 * The single Firebase app instance, shared by `platform/auth` and every
 * repository in `services/`.
 *
 * It lives in `platform/` rather than `services/` on purpose: it is the SDK
 * bootstrap, not a backend client, and `platform/auth` needs it. Moving it into
 * `services/` would make the platform layer depend on the service layer, which
 * inverts the layering the rest of `src/` follows.
 *
 * `getApps()` guards Fast Refresh re-evaluation — a second `initializeApp` for
 * the same name throws `duplicate-app`.
 *
 * Measurement/Analytics is deliberately not initialized: the SDK's analytics
 * module has no native implementation, so a device build would fail at import.
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const firebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firestore = getFirestore(firebaseApp);
export const cloudFunctions = getFunctions(firebaseApp);
