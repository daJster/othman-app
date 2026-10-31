import type { AuthResult, AuthUser, Unsubscribe } from '@/core/types';
import { firebaseApp } from '@/platform/firebase/firebase';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
} from 'firebase/auth';
import { toAuthError, toAuthUser } from './auth.mappers';
import type { AuthService } from './auth.types';

/**
 * Web auth instance.
 *
 * `getAuth` is correct here: the browser SDK persists the session itself
 * (IndexedDB), so there is nothing to configure. Google uses the popup flow,
 * which needs no OAuth client ID in our config — the Firebase project's
 * authorized domains list is the gate (see P8.1).
 */
const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

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

  async signInWithGoogle(): Promise<AuthResult> {
    try {
      const res = await signInWithPopup(auth, googleProvider);
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
