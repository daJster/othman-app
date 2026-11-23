import { onlineManager } from '@tanstack/react-query';
import { act, render } from '@testing-library/react-native';
import { ConnectivityBridge } from '@/api/connectivity';
import { useApiStore } from '@/api/store';

/**
 * The bridge is the only place the internet monitor meets TanStack. Its contract:
 * start the monitor once, and mirror every state change into both the store
 * (for a status affordance) and `onlineManager` (which pauses queries offline).
 */

jest.mock('@/platform/http', () => {
  let listener: ((state: string) => void) | null = null;

  return {
    connectivityMonitor: {
      state: () => 'unknown',
      isOnline: () => true,
      subscribe: jest.fn((next: (state: string) => void) => {
        listener = next;

        return () => {
          listener = null;
        };
      }),
      start: jest.fn(() => jest.fn()),
      check: jest.fn(),
      markOffline: jest.fn(),
    },
    __emit: (state: string) => listener?.(state),
  };
});

const platform = jest.requireMock('@/platform/http') as {
  connectivityMonitor: {
    state: jest.Mock;
    subscribe: jest.Mock;
    start: jest.Mock;
    check: jest.Mock;
    markOffline: jest.Mock;
  };
  __emit: (state: string) => void;
};

beforeEach(() => {
  useApiStore.getState().reset();
  onlineManager.setOnline(true);
});

describe('ConnectivityBridge', () => {
  it('starts the monitor and stops it on unmount', async () => {
    const { unmount } = await render(<ConnectivityBridge />);

    expect(platform.connectivityMonitor.start).toHaveBeenCalledTimes(1);

    await unmount();

    expect(platform.connectivityMonitor.subscribe).toHaveBeenCalledTimes(1);
  });

  it('mirrors the monitor into the store and the query online manager', async () => {
    await render(<ConnectivityBridge />);

    act(() => platform.__emit('offline'));

    expect(useApiStore.getState().internet).toBe('offline');
    expect(onlineManager.isOnline()).toBe(false);

    act(() => platform.__emit('online'));

    expect(useApiStore.getState().internet).toBe('online');
    expect(onlineManager.isOnline()).toBe(true);
  });

  it('treats unknown as online, so startup does not pause every query', async () => {
    await render(<ConnectivityBridge />);

    expect(useApiStore.getState().internet).toBe('unknown');
    expect(onlineManager.isOnline()).toBe(true);
  });
});
