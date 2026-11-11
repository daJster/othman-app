import { create } from 'zustand';
import type { BackendEvent } from '@/platform/backend';

/**
 * Client-local state for the request layer.
 *
 * Deliberately *not* a second copy of the session or the server cache:
 *
 *  - the session belongs to `AuthProvider` (one observer, one source of truth);
 *  - server rows belong to TanStack Query (one cache, one invalidation rule).
 *
 * What is left is genuinely local: is the event stream connected, what was the
 * last event, and where is the cursor. Zustand is the right tool for exactly
 * this shape — a small atomic store read outside React by the subscription
 * loop, and subscribed to by a single status affordance. Putting server data
 * here would recreate the bug this layer exists to prevent.
 */

export type ApiConnection = 'idle' | 'connecting' | 'online' | 'offline';

export type ApiStore = {
  connection: ApiConnection;
  cursor: number;
  lastEvent: BackendEvent | null;
  lastEventAt: number | null;
  eventsReceived: number;
  setConnection: (connection: ApiConnection) => void;
  setCursor: (cursor: number) => void;
  recordEvent: (event: BackendEvent) => void;
  reset: () => void;
};

const INITIAL = {
  connection: 'idle' as ApiConnection,
  cursor: 0,
  lastEvent: null,
  lastEventAt: null,
  eventsReceived: 0,
};

export const useApiStore = create<ApiStore>()((set) => ({
  ...INITIAL,

  setConnection: (connection) => set({ connection }),

  setCursor: (cursor) =>
    set((state) => (cursor > state.cursor ? { cursor } : state)),

  recordEvent: (event) =>
    set((state) => ({
      lastEvent: event,
      lastEventAt: Date.now(),
      cursor: Math.max(state.cursor, event.id),
      eventsReceived: state.eventsReceived + 1,
    })),

  reset: () => set({ ...INITIAL }),
}));

/** Read the cursor outside React (the subscription loop needs it on start). */
export function currentCursor(): number {
  return useApiStore.getState().cursor;
}
