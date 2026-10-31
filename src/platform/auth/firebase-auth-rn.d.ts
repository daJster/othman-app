import type { Persistence } from 'firebase/auth';

/**
 * `getReactNativePersistence` exists at runtime but not in the types.
 *
 * `firebase/auth`'s type entry (`auth/dist/auth/index.d.ts`) re-exports
 * `@firebase/auth`, and TypeScript resolves that package through its top-level
 * `types` condition — the browser API. Metro, meanwhile, resolves the same
 * import through the `react-native` condition and therefore loads
 * `@firebase/auth/dist/rn`, which does ship the helper. So the value is there
 * on device and missing from the compiler's view; this declaration closes the
 * gap without a `@ts-expect-error` at the call site.
 *
 * Minimal structural type for the storage argument: the only thing Firebase
 * needs is AsyncStorage's three methods.
 */
interface AsyncPersistenceStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

declare module 'firebase/auth' {
  export function getReactNativePersistence(
    storage: AsyncPersistenceStorage,
  ): Persistence;
}
