import type { AuthResult, AuthUser, Unsubscribe } from '@/core/types';

export interface AuthService {
  getCurrentUser(): Promise<AuthUser | null>;
  onAuthStateChanged(
    listener: (user: AuthUser | null) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe;

  signInWithEmail(email: string, password: string): Promise<AuthResult>;
  registerWithEmail(email: string, password: string): Promise<AuthResult>;
  signInWithGoogle(): Promise<AuthResult>;
  signOut(): Promise<void>;

  updateProfile(patch: {
    displayName?: string | null;
    photoURL?: string | null;
  }): Promise<void>;
}
