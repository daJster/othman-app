import type {
  AuthError,
  AuthSessionResult,
  TokenResponse,
} from 'expo-auth-session';
import {
  GOOGLE_DISCOVERY,
  googleRedirectUri,
  readGoogleIdToken,
  requestGoogleIdToken,
  selectGoogleClientId,
  type GoogleAuthRequest,
  type GoogleCodeExchange,
} from '@/platform/auth/google';

/**
 * Boundary tests for native Google sign-in.
 *
 * The real flow needs a browser, a dev client, and Google credentials (P3.3's
 * provider-validation task is blocked on those). Everything this module decides
 * *before* the network is pure or injectable, so it is covered here: client-ID
 * selection, cancellation, provider denial, a missing token, and — the important
 * one — no fabricated session when Google returns nothing usable.
 */

function success(
  params: Record<string, string> = {},
  authentication: TokenResponse | null = null,
): AuthSessionResult {
  return {
    type: 'success',
    errorCode: null,
    error: null,
    params,
    authentication,
    url: 'https://example.test',
  };
}

function providerError(
  message: string,
  code = 'server_error',
): AuthSessionResult {
  return {
    type: 'error',
    errorCode: code,
    error: { code, message } as AuthError,
    params: { error: code, error_description: message },
    authentication: null,
    url: 'https://example.test',
  };
}

function makeRequest(
  result: AuthSessionResult,
  codeVerifier = 'verifier',
): GoogleAuthRequest & { promptAsync: jest.Mock } {
  return {
    clientId: 'ios-client',
    redirectUri: 'othman://auth',
    codeVerifier,
    promptAsync: jest.fn(async () => result),
  };
}

async function run(
  result: AuthSessionResult,
  exchangeCode: GoogleCodeExchange = async () => null,
) {
  const request = makeRequest(result);
  const outcome = await requestGoogleIdToken({
    platform: 'ios',
    clientIds: { ios: 'ios-client' },
    redirectUri: 'othman://auth',
    nonce: 'nonce',
    createRequest: () => request,
    exchangeCode,
  });

  return { outcome, request };
}

describe('selectGoogleClientId', () => {
  it('uses the client bound to the platform', () => {
    const ids = { web: 'web', ios: 'ios', android: 'android' };

    expect(selectGoogleClientId('ios', ids)).toBe('ios');
    expect(selectGoogleClientId('android', ids)).toBe('android');
    expect(selectGoogleClientId('web', ids)).toBe('web');
  });

  it('does not fall back to the web client on a native platform', () => {
    // Falling back would make Google reject the redirect: the iOS/Android
    // clients are bound to the bundle/package and signing key.
    expect(selectGoogleClientId('ios', { web: 'web' })).toBeNull();
    expect(selectGoogleClientId('android', { web: 'web' })).toBeNull();
  });

  it('treats blank configuration as absent', () => {
    expect(selectGoogleClientId('ios', { ios: '   ' })).toBeNull();
  });
});

describe('googleRedirectUri', () => {
  it('prefers the explicitly configured redirect', () => {
    expect(
      googleRedirectUri({ EXPO_PUBLIC_GOOGLE_REDIRECT_URI: 'othman://custom' }),
    ).toBe('othman://custom');
  });

  it('falls back to the app scheme', () => {
    expect(googleRedirectUri({})).toContain('othman');
  });
});

describe('requestGoogleIdToken', () => {
  it('reports a configuration error instead of inventing a client ID', async () => {
    const createRequest = jest.fn();
    const outcome = await requestGoogleIdToken({
      platform: 'android',
      clientIds: {},
      createRequest,
    });

    expect(outcome).toMatchObject({ status: 'error', code: 'configuration' });
    expect(createRequest).not.toHaveBeenCalled();
  });

  it('refuses to run the native flow on web', async () => {
    const outcome = await requestGoogleIdToken({
      platform: 'web',
      clientIds: { web: 'web-client' },
    });

    expect(outcome).toMatchObject({ status: 'error', code: 'configuration' });
  });

  it('returns an ID token that Google put directly in the response', async () => {
    const { outcome } = await run(success({ id_token: 'direct-token' }));

    expect(outcome).toEqual({ status: 'success', idToken: 'direct-token' });
  });

  it('exchanges an authorization code for an ID token', async () => {
    const exchangeCode = jest.fn(async () => 'exchanged-token');

    const { outcome } = await run(success({ code: 'auth-code' }), exchangeCode);

    expect(outcome).toEqual({ status: 'success', idToken: 'exchanged-token' });
    expect(exchangeCode).toHaveBeenCalledWith({
      code: 'auth-code',
      clientId: 'ios-client',
      redirectUri: 'othman://auth',
      codeVerifier: 'verifier',
    });
  });

  it('treats a closed sheet as cancellation, not an error', async () => {
    const { outcome } = await run({ type: 'cancel' });

    expect(outcome).toMatchObject({ status: 'cancelled' });
  });

  it('treats a Google denial as cancellation', async () => {
    const denied: AuthSessionResult = {
      type: 'error',
      errorCode: 'access_denied',
      error: {
        code: 'access_denied',
        message: 'The user denied the request',
      } as AuthError,
      params: { error: 'access_denied' },
      authentication: null,
      url: 'https://example.test',
    };

    const { outcome } = await run(denied);

    expect(outcome).toMatchObject({ status: 'cancelled' });
  });

  it('surfaces a provider failure', async () => {
    const { outcome } = await run(providerError('Google is down'));

    expect(outcome).toMatchObject({
      status: 'error',
      code: 'unknown',
      message: 'Google is down',
    });
  });

  it('fails instead of fabricating a session when no token comes back', async () => {
    const { outcome } = await run(success({}));

    expect(outcome).toMatchObject({ status: 'error', code: 'unknown' });
  });

  it('fails when the code exchange returns no token', async () => {
    const { outcome } = await run(
      success({ code: 'auth-code' }),
      async () => null,
    );

    expect(outcome).toMatchObject({
      status: 'error',
      code: 'unknown',
      message: expect.stringContaining('ID token'),
    });
  });

  it('turns a thrown exchange into a typed error', async () => {
    const { outcome } = await run(success({ code: 'auth-code' }), async () => {
      throw new Error('token endpoint failed');
    });

    expect(outcome).toMatchObject({
      status: 'error',
      code: 'unknown',
      message: 'token endpoint failed',
    });
  });

  it('turns a thrown prompt into a typed error', async () => {
    const request = makeRequest(success({}));
    request.promptAsync.mockRejectedValue(new Error('browser unavailable'));

    const outcome = await requestGoogleIdToken({
      platform: 'ios',
      clientIds: { ios: 'ios-client' },
      redirectUri: 'othman://auth',
      nonce: 'nonce',
      createRequest: () => request,
      exchangeCode: async () => null,
    });

    expect(outcome).toMatchObject({
      status: 'error',
      code: 'unknown',
      message: 'browser unavailable',
    });
  });

  it('reports a request that cannot be created as a configuration error', async () => {
    const outcome = await requestGoogleIdToken({
      platform: 'ios',
      clientIds: { ios: 'ios-client' },
      redirectUri: 'othman://auth',
      createRequest: () => {
        throw new Error('invalid client');
      },
    });

    expect(outcome).toMatchObject({
      status: 'error',
      code: 'configuration',
      message: 'invalid client',
    });
  });
});

describe('readGoogleIdToken', () => {
  it('prefers the exchanged token over response params when both exist', async () => {
    const outcome = await readGoogleIdToken(
      success({ code: 'auth-code' }, { idToken: 'auth-token' } as never),
      async () => 'should-not-be-used',
      { clientId: 'ios-client', redirectUri: 'othman://auth' },
    );

    expect(outcome).toEqual({ status: 'success', idToken: 'auth-token' });
  });

  it('keeps the discovery document on the Google endpoints', () => {
    expect(GOOGLE_DISCOVERY.tokenEndpoint).toBe(
      'https://oauth2.googleapis.com/token',
    );
  });
});
