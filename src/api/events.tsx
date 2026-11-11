import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  MOCK_BACKEND_ENABLED,
  backendBaseUrl,
  backendClient,
  type BackendEvent,
} from '@/platform/backend';
import { useOptionalAuth } from '@/providers/auth-context';
import { queryKeys } from '@/services/query';
import { currentCursor, useApiStore } from './store';

/**
 * Live updates from the mock backend.
 *
 * A subscription, not a query: the server pushes, nothing is cached under a
 * key, and the only durable state is a cursor. That is why it is the one place
 * in this layer that talks to `backendClient` directly instead of going through
 * an endpoint.
 *
 * Two transports, one handler:
 *
 *  - **SSE** where `EventSource` exists (web). The server sends every frame as a
 *    default message and the payload carries the event type, so there is one
 *    listener rather than one per domain.
 *  - **Polling** everywhere else (React Native has no EventSource). Five
 *    seconds is below the threshold where a demo meeting appearing feels stale
 *    and above the threshold where a phone polling in the background burns
 *    battery during a review session.
 *
 * Either way, the event is turned into a cache invalidation — never written
 * into the cache directly. The server remains the only writer of truth, which
 * keeps optimistic edits and event updates from fighting.
 */

const POLL_INTERVAL_MS = 5_000;

/**
 * Which cached reads one server event makes stale.
 *
 * Both namespaces are invalidated where both exist, because the same row is
 * read through the service (`meetings`, `account`) and through the demo
 * endpoint (`demo.meetings`, `demo.accounts`). Missing one half is how the
 * calendar updates while the diagnostics view keeps showing yesterday.
 */
function invalidateForEvent(client: QueryClient, event: BackendEvent): void {
  const { type } = event;

  if (type.startsWith('meetings.')) {
    void client.invalidateQueries({ queryKey: queryKeys.meetings.root });
    void client.invalidateQueries({ queryKey: queryKeys.backend.meetingsRoot });
    return;
  }

  if (type.startsWith('account.')) {
    void client.invalidateQueries({ queryKey: queryKeys.account.root });
    void client.invalidateQueries({ queryKey: queryKeys.backend.accountRoot });
    return;
  }

  if (type.startsWith('quran.progress.')) {
    void client.invalidateQueries({ queryKey: queryKeys.progress.root });
    void client.invalidateQueries({
      queryKey: queryKeys.backend.quran.progress,
    });
    return;
  }

  if (type.startsWith('quran.bookmarks.')) {
    void client.invalidateQueries({
      queryKey: queryKeys.backend.quran.bookmarks,
    });
    return;
  }

  if (type.startsWith('quran.notes.')) {
    void client.invalidateQueries({
      queryKey: queryKeys.backend.quran.notesRoot,
    });
    // The reader panel reads through the notes service, not the backend hooks.
    void client.invalidateQueries({ queryKey: queryKeys.notes.root });
    return;
  }

  void client.invalidateQueries({ queryKey: queryKeys.backend.root });
}

/**
 * Mount once, below `<AuthProvider>`. Runs only while a session exists and the
 * mock backend is enabled; otherwise it is a no-op that sets the store to idle.
 */
export function useApiEvents(): void {
  const client = useQueryClient();
  // Optional: a test that renders the bridge outside a provider is "signed out",
  // not a crash.
  const auth = useOptionalAuth();
  const user = auth?.user ?? null;
  const setConnection = useApiStore((state) => state.setConnection);
  const setCursor = useApiStore((state) => state.setCursor);
  const recordEvent = useApiStore((state) => state.recordEvent);
  const active = MOCK_BACKEND_ENABLED && user !== null;
  const uid = user?.uid ?? null;

  useEffect(() => {
    if (!active) {
      setConnection('idle');
      return;
    }

    const token = backendClient.getToken();
    let disposed = false;
    let source: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let controller: AbortController | null = null;

    const handle = (event: BackendEvent): void => {
      if (disposed) return;

      if (event.type === 'ready') {
        const cursor =
          typeof event.payload === 'object' && event.payload !== null
            ? Number((event.payload as { cursor?: unknown }).cursor ?? 0)
            : 0;

        if (Number.isFinite(cursor)) setCursor(cursor);
        return;
      }

      recordEvent(event);
      invalidateForEvent(client, event);
    };

    // Web: EventSource reconnects on its own after `retry: 3000`.
    if (typeof EventSource !== 'undefined' && token) {
      setConnection('connecting');

      source = new EventSource(
        `${backendBaseUrl()}/v1/events/stream?token=${encodeURIComponent(
          token,
        )}&since=${currentCursor()}`,
      );

      source.onopen = () => setConnection('online');
      source.onmessage = (message) => {
        try {
          handle(JSON.parse(message.data) as BackendEvent);
        } catch {
          // A malformed frame is a dropped frame, not a broken subscription.
        }
      };
      source.onerror = () => setConnection('offline');

      return () => {
        disposed = true;
        source?.close();
      };
    }

    // Native (or a browser without EventSource): cursor-based polling.
    let cursor = currentCursor();

    const poll = async (): Promise<void> => {
      if (disposed) return;

      controller = new AbortController();

      try {
        const response = await backendClient.pollEvents(
          cursor,
          controller.signal,
        );

        for (const event of response.events) {
          cursor = Math.max(cursor, event.id);
          handle(event);
        }

        if (response.events.length === 0) setCursor(response.cursor);
        setConnection('online');
      } catch (error) {
        if (!(error instanceof Error && error.name === 'AbortError')) {
          setConnection('offline');
        }
      } finally {
        if (!disposed) timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
      }
    };

    setConnection('connecting');
    void poll();

    return () => {
      disposed = true;
      controller?.abort();
      if (timer) clearTimeout(timer);
    };
  }, [active, uid, client, recordEvent, setConnection, setCursor]);
}

/** Renders nothing; placed in the provider tree to keep one subscription. */
export function ApiEventsBridge() {
  useApiEvents();

  return null;
}
