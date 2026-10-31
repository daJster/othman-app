# Authentication setup

This app signs in with Firebase Auth. The web build uses the Firebase popup; iOS
and Android use a native Google flow (`expo-auth-session`, authorization code +
PKCE) and then hand the ID token to Firebase. Nothing in this document is a
secret: every value below is a **public** OAuth client ID or a public URL.

The implementation lives in `src/platform/auth/` (transport) and
`src/providers/auth-provider.tsx` (session + profile). UI is
`src/app/auth/sign-in.tsx`; private routes are wrapped in `RequireAuth`.

## 1. Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable                               | Where it comes from                                       |
| -------------------------------------- | --------------------------------------------------------- |
| `EXPO_PUBLIC_FIREBASE_*`               | Firebase console → Project settings → Your apps → Web app |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`     | Google Cloud console → Credentials → OAuth client (Web)   |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`     | OAuth client (iOS)                                        |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | OAuth client (Android)                                    |
| `EXPO_PUBLIC_GOOGLE_REDIRECT_URI`      | Optional; overrides the default `othman://auth`           |

`EXPO_PUBLIC_*` values are embedded in the bundle by design. Never put a client
**secret** here or anywhere in the repository: installed apps cannot keep one,
which is why the native flow uses PKCE.

A missing ID for the running platform is surfaced as a typed `configuration`
error. The app does not fall back to the web client: the iOS/Android clients are
bound to the bundle identifier / package name and would be rejected.

## 2. Firebase console

1. Authentication → Sign-in method: enable **Email/Password** and **Google**.
2. Authentication → Settings → Authorized domains: add every web origin that
   serves the app (`localhost` during development, the hosting domain in
   production). The web popup fails with `auth/unauthorized-domain` otherwise.
3. Create the account records through the app (or the console). There is no
   automatic account linking: if an email already exists with another provider,
   the user sees a recovery message and must use the original method.

## 3. Google Cloud console

Create three OAuth clients in the same project as the Firebase app (Firebase
creates a Web client automatically when Google sign-in is enabled; reuse it):

| Type    | Required binding                                                    |
| ------- | ------------------------------------------------------------------- |
| Web     | Authorized JavaScript origin(s) and redirect URI(s) for the web app |
| iOS     | Bundle ID `com.kuttab.othman`                                       |
| Android | Package `com.kuttab.othman` + SHA-1 of the signing certificate      |

The Android SHA-1 differs between the debug keystore, the EAS development build
and the Play signing key. Register each one that will sign a build; a mismatch
fails at the provider, not in the app.

**Redirect URI.** The default is `othman://auth` (the scheme declared in
`app.config.ts`). Register exactly that string on the native clients, or set
`EXPO_PUBLIC_GOOGLE_REDIRECT_URI` and register that instead. It must match
character for character; a trailing slash counts.

## 4. Rebuild requirements

The scheme, the native auth-session module and the client IDs are read at build
time. After changing any of them:

- Native: rebuild the dev client / app (`eas build --profile development`, or
  `npx expo run:ios` / `run:android`). Reloading JS is not enough.
- Web: rebuild and redeploy (`npm run build`). A static web export uses the
  Firebase popup and needs no Google client ID in the bundle.
- `.env` changes require restarting the dev server (Expo reads it at startup).

## 5. Error recovery

| Symptom                                         | Cause / fix                                                                 |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| "not configured for this build"                 | Missing client ID for the platform, or `.env` not loaded                    |
| Google returns `redirect_uri_mismatch`          | URI not registered, or differs from `EXPO_PUBLIC_GOOGLE_REDIRECT_URI`       |
| `auth/unauthorized-domain` on web               | Origin missing from Firebase authorized domains                             |
| `auth/account-exists-with-different-credential` | Email already uses another provider; sign in that way (no auto-link)        |
| Sign-in succeeds but the profile stays in error | Firestore read blocked (rules/index); use Retry, then fix the backend       |
| Session not restored after relaunch             | Native persistence requires a real build; Expo Go/in-memory cannot prove it |

Sign-out cancels and removes account/progress/meetings query data and resets the
reader's transient selection. The Quran cache, theme, language, edition and last
page are deliberately kept.

## 6. Mock and local boundaries

- `src/platform/auth/authService.ts` (native) and `authService.web.ts` (web) are
  selected by Metro. Consumers import only the barrel.
- `AuthProvider` accepts an injected `service`, which is how tests run without
  Firebase (`src/test-utils/auth.tsx`).
- `src/services/profile/demo-profile.repository.ts` is retained **only** as a
  test fixture for the repository contract. The app uses
  `firestoreProfileRepository`; the demo session was deleted.
- Google network calls are not mocked in app code. Tests inject
  `createRequest`/`exchangeCode` at the `platform/auth/google.ts` boundary, so a
  test never opens a browser or contacts Google.

## 7. Backend authorization (still required)

`RequireAuth` and tab filtering are UX, not security. Firestore rules must:

- allow a signed-in user to read and update only their own `users/{uid}`;
- reject client writes to `role` (role changes belong to an administrator path,
  not this client);
- deny unauthenticated reads of profile, meetings and progress data.

The rules/emulator verification is tracked as task 4.10 in
`openspec/changes/complete-expo-migration/tasks.md` and is **blocked** until
rules access or an emulator is available. Until then, do not treat the UI guard
as authorization.
