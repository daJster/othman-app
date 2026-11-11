import type { ProfileDocument } from '../contracts.ts';
import type { DocumentStore } from '../stores/documents.ts';

/**
 * Account profile documents (the NoSQL half of an account).
 *
 * Kept separate from the users table so the mock demonstrates the intended
 * split: identity/role/credentials are relational, free-form preferences are a
 * document. Firestore's `users/{uid}` maps to this collection one-for-one.
 */

const COLLECTION = 'profiles';

export function defaultProfile(locale: 'ar' | 'en' = 'ar'): ProfileDocument {
  return {
    bio: null,
    locale,
    notifications: true,
    updatedAt: new Date().toISOString(),
  };
}

export function readProfile(
  documents: DocumentStore,
  uid: string,
): ProfileDocument | null {
  return documents.get<ProfileDocument>(COLLECTION, uid);
}

export function ensureProfile(
  documents: DocumentStore,
  uid: string,
): ProfileDocument {
  const existing = readProfile(documents, uid);
  if (existing) return existing;

  return documents.set(COLLECTION, uid, defaultProfile());
}

export function writeProfile(
  documents: DocumentStore,
  uid: string,
  patch: Partial<Omit<ProfileDocument, 'updatedAt'>>,
): ProfileDocument {
  const current = readProfile(documents, uid) ?? defaultProfile();

  return documents.set(COLLECTION, uid, {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  } satisfies ProfileDocument);
}

export function removeProfile(documents: DocumentStore, uid: string): void {
  documents.remove(COLLECTION, uid);
}
