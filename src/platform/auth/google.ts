import * as Crypto from 'expo-crypto';
import {
  AccessTokenRequest,
  AuthRequest,
  ResponseType,
  makeRedirectUri,
  type AuthSessionResult,
} from 'expo-auth-session';
import { Platform } from 'react-native';
import type { AuthErrorCode } from '@/core/types';

/**
 * Native Google sign-in.
 *
 * The app asks Google for an **ID token** and hands it to Firebase
 * (`GoogleAuthProvider.credential`). It never asks for an access token and never
 * calls a Google API itself, so no token is stored anywhere.
 *
 * Flow: authorization code + PKCE. Google no longer supports the implicit
 * `id_token` response on installed applications, so the code has to be
 * exchanged at the token endpoint. PKCE (not a client secret) proves the
 * exchange belongs to this request — a secret cannot be kept in a native app.
 *
 * The redirect URI and the per-platform client IDs are *configuration*, not
 * code: a missing ID is reported as a configuration error rather than being
 * filled with a placeholder. The console side (client type, bundle/package
 * binding, redirect registration) cannot be verified from this machine, which
 * is why P3.3's provider-validation task stays blocked — see `MIGRATE.md`.
 */

export const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  userInfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
} as const;

/** Scopes Google requires before it will mint an ID token for this app. */
const GOOGLE_SCOPES = ['openid', 'profile', 'email'] as const;

export type GooglePlatform = 'ios' | 'android' | 'web';

export type GoogleClientIds = {
  readonly web?: string;
  readonly ios?: string;
  readonly android?: string;
};

/**
 * The subset of `AuthRequest` this module needs. Tests substitute a plain
 * object, so the orchestration below is exercised without a browser or the
 * native auth-session module.
 */
export type GoogleAuthRequest = {
  readonly clientId: string;
  readonly redirectUri: string;
  readonly codeVerifier?: string;
  promptAsync(discovery: typeof GOOGLE_DISCOVERY): Promise<AuthSessionResult>;
};

export type GoogleCodeExchange = (input: {
  readonly code: string;
  readonly clientId: string;
  readonly redirectUri: string;
  readonly codeVerifier?: string;
}) => Promise<string | null>;

export type GoogleIdTokenResult =
  | { readonly status: 'success'; readonly idToken: string }
  | { readonly status: 'cancelled'; readonly message: string }
  | {
      readonly status: 'error';
      readonly code: AuthErrorCode;
      readonly message: string;
    };

export type RequestGoogleIdTokenOptions = {
  readonly platform?: GooglePlatform;
  readonly clientIds?: GoogleClientIds;
  readonly redirectUri?: string;
  readonly createRequest?: (input: {
    readonly clientId: string;
    readonly redirectUri: string;
    readonly nonce: string;
  }) => GoogleAuthRequest;
  readonly exchangeCode?: GoogleCodeExchange;
  /** Test seam for the nonce; production uses a cryptographic UUID. */
  readonly nonce?: string;
};

export function toGooglePlatform(value: string): GooglePlatform {
  if (value === 'ios' || value === 'android') return value;
  return 'web';
}

/**
 * The client ID for the running platform.
 *
 * A native build needs its own OAuth client: an iOS client is bound to the
 * bundle identifier, an Android client to the package plus signing-certificate
 * SHA-1. Falling back to the web client would make the console reject the
 * redirect, so a missing entry is `null`.
 */
export function selectGoogleClientId(
  platform: GooglePlatform,
  ids: GoogleClientIds,
): string | null {
  const candidate =
    platform === 'ios'
      ? ids.ios
      : platform === 'android'
        ? ids.android
        : ids.web;

  const trimmed = candidate?.trim();
  return trimmed ? trimmed : null;
}

/** Public configuration as it appears in `.env`. Empty strings are absent. */
export function googleClientIdsFromEnv(
  env: Record<string, string | undefined> = process.env,
): GoogleClientIds {
  return {
    web: env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    ios: env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    android: env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  };
}

/**
 * The URI Google redirects back to.
 *
 * `EXPO_PUBLIC_GOOGLE_REDIRECT_URI` wins when set, because the value has to
 * match whatever is registered in the Google console exactly and the two native
 * clients do not necessarily share a scheme. The default is the app scheme,
 * which is also what `app.config.ts` declares (`othman://`).
 */
export function googleRedirectUri(
  env: Record<string, string | undefined> = process.env,
): string {
  const configured = env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI?.trim();
  if (configured) return configured;

  try {
    return makeRedirectUri({ scheme: 'othman', path: 'auth' });
  } catch {
    // `makeRedirectUri` reads the Expo manifest, which does not exist in Jest
    // (and is absent from a bare web export). The app scheme is declared in
    // `app.config.ts`, so the static form is the same URI in every build.
    return 'othman://auth';
  }
}

function defaultCreateRequest(input: {
  clientId: string;
  redirectUri: string;
  nonce: string;
}): GoogleAuthRequest {
  return new AuthRequest({
    clientId: input.clientId,
    redirectUri: input.redirectUri,
    responseType: ResponseType.Code,
    scopes: [...GOOGLE_SCOPES],
    usePKCE: true,
    // `nonce` binds the returned ID token to this request; Google echoes it in
    // the token, and Firebase rejects a mismatch on its own side.
    extraParams: {
      nonce: input.nonce,
      access_type: 'online',
      prompt: 'select_account',
    },
  });
}

async function defaultExchangeCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier?: string;
}): Promise<string | null> {
  const request = new AccessTokenRequest({
    clientId: input.clientId,
    code: input.code,
    redirectUri: input.redirectUri,
    extraParams: input.codeVerifier
      ? { code_verifier: input.codeVerifier }
      : undefined,
  });

  const token = await request.performAsync(GOOGLE_DISCOVERY);
  return token.idToken ?? null;
}

type DetailedAuthSessionResult = Extract<
  AuthSessionResult,
  { params: Record<string, string> }
>;

function errorMessage(result: DetailedAuthSessionResult): string {
  const fromError = result.error?.message;
  if (typeof fromError === 'string' && fromError) return fromError;

  const description = result.params?.error_description;
  if (typeof description === 'string' && description) return description;

  const error = result.params?.error;
  if (typeof error === 'string' && error) return error;

  return 'Google sign-in failed.';
}

/**
 * Turns one auth-session result into an ID token or a typed failure.
 *
 * Extracted so every branch (cancel, provider denial, missing token) is a unit
 * test rather than something only a device can reach.
 */
export function readGoogleIdToken(
  result: AuthSessionResult,
  exchangeCode: GoogleCodeExchange,
  request: Pick<GoogleAuthRequest, 'clientId' | 'redirectUri' | 'codeVerifier'>,
): Promise<GoogleIdTokenResult> {
  return Promise.resolve().then(async () => {
    if (
      result.type === 'cancel' ||
      result.type === 'dismiss' ||
      result.type === 'locked'
    ) {
      return {
        status: 'cancelled',
        message: 'Google sign-in was cancelled.',
      } as const;
    }

    if (result.type === 'error') {
      const providerCode = (result.error as { code?: unknown } | null)?.code;
      if (providerCode === 'access_denied') {
        return {
          status: 'cancelled',
          message: 'Google sign-in was cancelled.',
        } as const;
      }

      return {
        status: 'error',
        code: 'unknown',
        message: errorMessage(result),
      } as const;
    }

    if (result.type !== 'success') {
      return {
        status: 'error',
        code: 'unknown',
        message: 'Google sign-in did not complete.',
      } as const;
    }

    const directToken =
      result.authentication?.idToken ?? result.params?.id_token;
    if (typeof directToken === 'string' && directToken) {
      return { status: 'success', idToken: directToken } as const;
    }

    const code = result.params?.code;
    if (typeof code !== 'string' || !code) {
      return {
        status: 'error',
        code: 'unknown',
        message: 'Google did not return an authorization code.',
      } as const;
    }

    const idToken = await exchangeCode({
      code,
      clientId: request.clientId,
      redirectUri: request.redirectUri,
      codeVerifier: request.codeVerifier,
    });

    if (!idToken) {
      return {
        status: 'error',
        code: 'unknown',
        message: 'Google did not return an ID token.',
      } as const;
    }

    return { status: 'success', idToken } as const;
  });
}

/**
 * Runs the full native Google flow and returns the ID token.
 *
 * Every failure is a value, not a thrown exception: the screen needs to tell
 * "the user closed the sheet" (no error UI) from "this build is missing a
 * client ID" (configuration message) from a transport failure.
 */
export async function requestGoogleIdToken(
  options: RequestGoogleIdTokenOptions = {},
): Promise<GoogleIdTokenResult> {
  const platform = options.platform ?? toGooglePlatform(Platform.OS);
  const ids = options.clientIds ?? googleClientIdsFromEnv();
  const clientId = selectGoogleClientId(platform, ids);

  if (!clientId) {
    return {
      status: 'error',
      code: 'configuration',
      message: `Google sign-in is not configured for ${platform}. Add the public OAuth client ID for this platform.`,
    };
  }

  if (platform === 'web') {
    return {
      status: 'error',
      code: 'configuration',
      message:
        'Native Google sign-in is unavailable on web; the web build uses the Firebase popup.',
    };
  }

  const redirectUri = options.redirectUri ?? googleRedirectUri();
  const nonce = options.nonce ?? Crypto.randomUUID();
  const createRequest = options.createRequest ?? defaultCreateRequest;
  const exchangeCode = options.exchangeCode ?? defaultExchangeCode;

  let request: GoogleAuthRequest;
  try {
    request = createRequest({ clientId, redirectUri, nonce });
  } catch (error) {
    return {
      status: 'error',
      code: 'configuration',
      message:
        error instanceof Error
          ? error.message
          : 'Could not start Google sign-in.',
    };
  }

  let result: AuthSessionResult;
  try {
    result = await request.promptAsync(GOOGLE_DISCOVERY);
  } catch (error) {
    return {
      status: 'error',
      code: 'unknown',
      message:
        error instanceof Error ? error.message : 'Google sign-in failed.',
    };
  }

  try {
    return await readGoogleIdToken(result, exchangeCode, request);
  } catch (error) {
    return {
      status: 'error',
      code: 'unknown',
      message:
        error instanceof Error
          ? error.message
          : 'Google did not return an ID token.',
    };
  }
}
