import type { UserRole } from './user';

export interface AccountData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole | null;
  phoneNumber?: string | null;
  // Add custom Firestore profile fields here.
}
