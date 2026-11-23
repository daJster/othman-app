import { onlineManager } from '@tanstack/react-query';
import { useEffect } from 'react';
import { connectivityMonitor, type ConnectivityState } from '@/platform/http';
import { useApiStore } from './store';

/**
 * Connects the internet monitor to the rest of the app.
 *
 * Two jobs, one subscription:
 *
 *  - mirror the monitor's state into the Zustand store, so a status affordance
 *    can show it;
 *  - mirror it into TanStack's `onlineManager`. That is the part that makes
 *    "offline" cheap: queries pause (`fetchStatus: 'paused'`) instead of
 *    failing, and they run by themselves when the probe reports the connection
 *    is back. Retries never turn into a failure loop while the device is in a
 *    tunnel.
 *
 * `unknown` is treated as online. The probe answers within one round trip, and
 * pausing every query until then would make startup depend on a canary host.
 * Once the monitor says offline, the transport refuses requests too, so a
 * query that manages to run still fails immediately instead of waiting out a
 * timeout.
 */
export function useConnectivityWatch(): void {
  const setInternet = useApiStore((state) => state.setInternet);

  useEffect(() => {
    const reflect = (state: ConnectivityState): void => {
      setInternet(state);
      onlineManager.setOnline(state !== 'offline');
    };

    // Subscribe before starting, so the immediate probe's result is not missed.
    reflect(connectivityMonitor.state());
    const unsubscribe = connectivityMonitor.subscribe(reflect);
    const stop = connectivityMonitor.start();

    return () => {
      unsubscribe();
      stop();
    };
  }, [setInternet]);
}

/** Renders nothing; mounted once near the providers. */
export function ConnectivityBridge() {
  useConnectivityWatch();

  return null;
}
