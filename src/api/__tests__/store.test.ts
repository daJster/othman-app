import type { BackendEvent } from '@/platform/backend';
import { currentCursor, useApiStore } from '../store';

/**
 * The store is intentionally small, and these tests are the reason it can stay
 * that way: they pin the guarantees the event loop depends on — the cursor only
 * moves forward, an event is recorded exactly once, and `reset` clears the
 * transport state without touching anything else.
 */

function event(id: number, type = 'meetings.created'): BackendEvent {
  return { id, type, payload: null, createdAt: '2026-11-11T10:00:00Z' };
}

beforeEach(() => {
  useApiStore.getState().reset();
});

describe('useApiStore', () => {
  it('starts idle with no cursor', () => {
    const state = useApiStore.getState();

    expect(state.connection).toBe('idle');
    expect(state.cursor).toBe(0);
    expect(state.lastEvent).toBeNull();
    expect(state.eventsReceived).toBe(0);
  });

  it('moves the cursor forward only', () => {
    const { setCursor } = useApiStore.getState();

    setCursor(5);
    setCursor(2);

    expect(useApiStore.getState().cursor).toBe(5);
  });

  it('records an event and advances the cursor to its id', () => {
    const { recordEvent } = useApiStore.getState();

    recordEvent(event(4));

    const state = useApiStore.getState();

    expect(state.cursor).toBe(4);
    expect(state.eventsReceived).toBe(1);
    expect(state.lastEvent?.id).toBe(4);
    expect(state.lastEventAt).not.toBeNull();
  });

  it('keeps the newest cursor when events arrive out of order', () => {
    const { recordEvent } = useApiStore.getState();

    recordEvent(event(9));
    recordEvent(event(3));

    expect(useApiStore.getState().cursor).toBe(9);
    expect(useApiStore.getState().eventsReceived).toBe(2);
  });

  it('reads the cursor outside React', () => {
    useApiStore.getState().setCursor(11);

    expect(currentCursor()).toBe(11);
  });

  it('resets to the initial transport state', () => {
    const store = useApiStore.getState();

    store.setConnection('online');
    store.setCursor(12);
    store.recordEvent(event(12));
    store.reset();

    expect(useApiStore.getState()).toMatchObject({
      connection: 'idle',
      cursor: 0,
      lastEvent: null,
      lastEventAt: null,
      eventsReceived: 0,
    });
  });
});
