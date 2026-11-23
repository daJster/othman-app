import {
  createConnectivityMonitor,
  probeReachability,
  type ConnectivityState,
} from '@/platform/http/connectivity';

/**
 * The connectivity monitor decides whether any request may leave the device, so
 * these cases pin the three properties that matter: unknown fails open, a probe
 * result is shared instead of repeated, and the cadence follows the state
 * (retry quickly while offline, re-check slowly while online).
 */

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.useRealTimers();
});

const flush = () => Promise.resolve().then(() => Promise.resolve());

describe('probeReachability', () => {
  it('is online when any canary answers, even with an error status', async () => {
    const fetchMock = jest.fn(async (url: string) =>
      url.includes('bad')
        ? Promise.reject(new TypeError('Network request failed'))
        : { ok: false, status: 404 },
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      probeReachability(['https://bad.test/', 'https://good.test/'], 100),
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://good.test/',
      expect.objectContaining({ method: 'HEAD' }),
    );
  });

  it('is offline when every canary fails', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;

    await expect(
      probeReachability(['https://a.test/', 'https://b.test/'], 100),
    ).resolves.toBe(false);
  });

  it('is offline when the canaries hang past the timeout', async () => {
    jest.useFakeTimers();
    globalThis.fetch = jest.fn(
      (_url: string, init: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new Error('The operation was aborted.')),
          );
        }),
    ) as unknown as typeof fetch;

    const pending = probeReachability(['https://slow.test/'], 1_000);

    await jest.advanceTimersByTimeAsync(1_000);

    await expect(pending).resolves.toBe(false);
  });

  it('does not probe when there is no canary to probe', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(probeReachability([])).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('createConnectivityMonitor', () => {
  it('starts unknown and fails open', () => {
    const monitor = createConnectivityMonitor({ probe: jest.fn() });

    expect(monitor.state()).toBe('unknown');
    expect(monitor.isOnline()).toBe(true);
  });

  it('notifies subscribers when the state changes', async () => {
    const monitor = createConnectivityMonitor({
      probe: jest.fn(async () => false),
    });
    const seen: ConnectivityState[] = [];

    monitor.subscribe((state) => seen.push(state));

    await expect(monitor.check()).resolves.toBe('offline');
    await expect(monitor.check()).resolves.toBe('offline');

    // A repeat result is not an event: subscribers hear about transitions.
    expect(seen).toEqual(['offline']);
    expect(monitor.isOnline()).toBe(false);
  });

  it('shares one probe between concurrent checks', async () => {
    let release!: (online: boolean) => void;
    const probe = jest.fn(
      () =>
        new Promise<boolean>((resolve) => {
          release = resolve;
        }),
    );
    const monitor = createConnectivityMonitor({ probe });

    const first = monitor.check();
    const second = monitor.check();

    release(true);

    await expect(Promise.all([first, second])).resolves.toEqual([
      'online',
      'online',
    ]);
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('probes immediately when started and stops probing when stopped', async () => {
    jest.useFakeTimers();
    const probe = jest.fn(async () => true);
    const monitor = createConnectivityMonitor({
      probe,
      onlineRecheckMs: 5_000,
    });

    const stop = monitor.start();

    await flush();
    expect(probe).toHaveBeenCalledTimes(1);
    expect(monitor.state()).toBe('online');

    await jest.advanceTimersByTimeAsync(5_000);
    expect(probe).toHaveBeenCalledTimes(2);

    stop();
    await jest.advanceTimersByTimeAsync(60_000);
    expect(probe).toHaveBeenCalledTimes(2);
  });

  it('retries on the offline cadence, faster than the online re-check', async () => {
    jest.useFakeTimers();
    const probe = jest.fn(async () => false);
    const monitor = createConnectivityMonitor({
      probe,
      offlineRetryMs: 1_000,
      onlineRecheckMs: 60_000,
    });

    const stop = monitor.start();

    await flush();
    expect(monitor.state()).toBe('offline');

    await jest.advanceTimersByTimeAsync(999);
    expect(probe).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    expect(probe).toHaveBeenCalledTimes(2);

    stop();
  });

  it('goes offline immediately when the platform reports the link is down', async () => {
    jest.useFakeTimers();
    const monitor = createConnectivityMonitor({
      probe: jest.fn(async () => true),
    });
    const stop = monitor.start();

    await flush();
    expect(monitor.state()).toBe('online');

    monitor.markOffline();

    expect(monitor.state()).toBe('offline');
    expect(monitor.isOnline()).toBe(false);

    stop();
  });

  it('keeps the state honest when one subscriber throws', async () => {
    const monitor = createConnectivityMonitor({
      probe: jest.fn(async () => true),
    });
    const healthy = jest.fn();

    monitor.subscribe(() => {
      throw new Error('subscriber failure');
    });
    monitor.subscribe(healthy);

    await monitor.check();

    expect(healthy).toHaveBeenCalledWith('online');
  });
});
