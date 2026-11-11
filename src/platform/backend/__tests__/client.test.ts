import { HttpError, HttpTimeoutError, type HttpClient } from '@/platform/http';
import { BackendClient } from '../client';
import { BackendError } from '../types';

/**
 * Backend gateway contract.
 *
 * The fake transport records the exact URL/init the client produced, so these
 * tests cover the parts a screen cannot see: JSON encoding, the bearer header,
 * query serialization and error-code translation.
 */

function fakeHttp() {
  const request = jest.fn();

  return {
    request,
    http: {
      request,
      get: jest.fn(),
      post: jest.fn(),
    } as unknown as HttpClient,
  };
}

function fakeStorage(initial: string | null = null) {
  let value = initial;

  return {
    getItem: jest.fn(async () => value),
    setItem: jest.fn(async (_key: string, next: string) => {
      value = next;
      return true;
    }),
    removeItem: jest.fn(async () => {
      value = null;
      return true;
    }),
    clear: jest.fn(async () => true),
    read: () => value,
  };
}

function createClient(initialToken: string | null = null) {
  const { http, request } = fakeHttp();
  const storage = fakeStorage(initialToken);

  return {
    client: new BackendClient({
      http,
      storage: storage as never,
      baseUrl: 'http://backend.test/',
    }),
    request,
    storage,
  };
}

describe('BackendClient', () => {
  it('sends a JSON body, bearer token and query string', async () => {
    const { client, request } = createClient();
    await client.setToken('session-token');
    request.mockResolvedValueOnce({ meeting: { id: 1 } });

    await client.updateMeeting(1, { title: 'Renamed' });
    await client.listMeetings({ from: '2030-01-01', to: '2030-01-31' });

    expect(request).toHaveBeenNthCalledWith(
      1,
      'http://backend.test/v1/meetings/1',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          authorization: 'Bearer session-token',
          'content-type': 'application/json',
        }),
        body: JSON.stringify({ title: 'Renamed' }),
      }),
    );

    expect(request).toHaveBeenNthCalledWith(
      2,
      'http://backend.test/v1/meetings?from=2030-01-01&to=2030-01-31',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('hydrates a persisted token exactly once', async () => {
    const { client, storage } = createClient('persisted');

    await client.hydrateToken();
    await client.hydrateToken();

    expect(storage.getItem).toHaveBeenCalledTimes(1);
    expect(client.getToken()).toBe('persisted');
  });

  it('clears the token on sign-out', async () => {
    const { client, storage } = createClient('persisted');

    await client.setToken(null);

    expect(client.getToken()).toBeNull();
    expect(storage.read()).toBeNull();
  });

  it('translates an API error envelope into a BackendError', async () => {
    const { client, request } = createClient();
    request.mockRejectedValue(
      new HttpError(403, 'http://backend.test', undefined, {
        error: { code: 'permission-denied', message: 'Not allowed' },
      }),
    );

    await expect(client.listAccounts()).rejects.toMatchObject({
      name: 'BackendError',
      code: 'permission-denied',
      status: 403,
      message: 'Not allowed',
    });
    await expect(client.listAccounts()).rejects.toBeInstanceOf(BackendError);
  });

  it('reports a timeout separately from a network failure', async () => {
    const { client, request } = createClient();
    request.mockRejectedValueOnce(
      new HttpTimeoutError('http://backend.test', 12_000),
    );

    await expect(client.health()).rejects.toMatchObject({ code: 'timeout' });
  });

  it('unwraps the callable envelope', async () => {
    const { client, request } = createClient();
    request.mockResolvedValueOnce({ result: { ok: true } });

    await expect(client.callFunction('system.health')).resolves.toEqual({
      ok: true,
    });
    expect(request).toHaveBeenCalledWith(
      'http://backend.test/v1/functions/system.health',
      expect.objectContaining({
        method: 'POST',
        body: '{}',
      }),
    );
  });
});
