import type { AuthResult, AuthUser, Unsubscribe } from '@/core/types';
import { firebaseApp } from '@/platform/firebase/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  type Auth,
} from 'firebase/auth';
import { toAuthError, toAuthUser } from './auth.mappers';
import { requestGoogleIdToken } from './google';
import type { AuthService } from './auth.types';

/**
 * Native auth instance.
 *
 * `getReactNativePersistence(AsyncStorage)` is what makes the session survive a
 * relaunch: the default RN persistence is in-memory, so without it the user is
 * signed out every cold start.
 *
 * `initializeAuth` throws `auth/already-initialized` on a second call (Fast
 * Refresh re-evaluates modules), and `getAuth` is the supported way back to the
 * instance that already exists. The guard is not defensive noise — without it a
 * hot reload during sign-in crashes the screen.
 */
function createAuth(): Auth {
  try {
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    if (
      (error as { code?: string } | null)?.code === 'auth/already-initialized'
    ) {
      return getAuth(firebaseApp);
    }
    throw error;
  }
}

const auth = createAuth();

export const authService: AuthService = {
  async getCurrentUser(): Promise<AuthUser | null> {
    const user = auth.currentUser;
    return user ? toAuthUser(user) : null;
  },

  onAuthStateChanged(
    listener: (user: AuthUser | null) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    return firebaseOnAuthStateChanged(
      auth,
      (user) => listener(user ? toAuthUser(user) : null),
      (error) => onError?.(error),
    );
  },

  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      return { status: 'success', user: toAuthUser(res.user) };
    } catch (error) {
      return toAuthError(error, 'Failed to sign in');
    }
  },

  async registerWithEmail(
    email: string,
    password: string,
  ): Promise<AuthResult> {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      return { status: 'success', user: toAuthUser(res.user) };
    } catch (error) {
      return toAuthError(error, 'Failed to register');
    }
  },

  /**
   * Native Google sign-in: Google issues an ID token, Firebase turns it into a
   * session. The token is never stored — `signInWithCredential` consumes it and
   * Firebase owns the session from here on.
   */
  async signInWithGoogle(): Promise<AuthResult> {
    const google = await requestGoogleIdToken();

    if (google.status === 'cancelled') {
      return {
        status: 'error',
        code: 'cancelled',
        message: google.message,
      };
    }

    if (google.status === 'error') {
      return {
        status: 'error',
        code: google.code,
        message: google.message,
      };
    }

    try {
      const credential = GoogleAuthProvider.credential(google.idToken);
      const res = await signInWithCredential(auth, credential);
      return { status: 'success', user: toAuthUser(res.user) };
    } catch (error) {
      return toAuthError(error, 'Failed to sign in with Google');
    }
  },

  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  },

  async updateProfile(patch: {
    displayName?: string | null;
    photoURL?: string | null;
  }): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    await firebaseUpdateProfile(user, {
      displayName: patch.displayName ?? undefined,
      photoURL: patch.photoURL ?? undefined,
    });
  },
};
