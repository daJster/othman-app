import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { NoteAyah, QuranNote } from '@/core/domain/notes/notes';
import { useAyahNotes } from '../use-notes';
import { notesService } from '@/services/notes';
import { queryKeys } from '@/services/query';

/**
 * Notes query + optimistic write.
 *
 * The service is mocked at its barrel: persistence is covered by the
 * repository tests. What matters here is the cache contract — namespace/ayah
 * isolation, an addition that is visible before the write resolves, a rollback
 * on failure, and a retry that reuses the note's identity instead of creating a
 * duplicate.
 */

jest.mock('@/services/notes', () => ({
  notesService: {
    list: jest.fn(),
    save: jest.fn(),
  },
}));

const service = notesService as unknown as {
  list: jest.Mock;
  save: jest.Mock;
};

const AYAH: NoteAyah = { surah: 1, ayah: 1, absoluteNumber: 1 };
const OTHER_AYAH: NoteAyah = { surah: 2, ayah: 255, absoluteNumber: 262 };

const NOTE: QuranNote = {
  id: 'n1',
  ayah: AYAH,
  text: 'first',
  createdAt: 1_700_000_000_000,
};

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: 0 },
    },
  });
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

let client: QueryClient;
let stored: QuranNote[];

beforeEach(() => {
  jest.clearAllMocks();
  client = makeClient();
  stored = [];
  service.list.mockImplementation(async () => stored);
  service.save.mockImplementation(async (_namespace, note: QuranNote) => {
    stored = [...stored.filter((row) => row.id !== note.id), note];

    return note;
  });
});

afterEach(() => {
  client.clear();
});

describe('useAyahNotes', () => {
  it('reports pending, then empty and ready for the selected ayah only', async () => {
    service.list.mockResolvedValue([
      NOTE,
      { ...NOTE, id: 'n2', ayah: OTHER_AYAH },
    ]);

    const { result } = await renderHook(() => useAyahNotes('guest', AYAH), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    if (result.current.state.status !== 'ready') throw new Error('unreachable');

    expect(result.current.state.data).toEqual([NOTE]);
    expect(service.list).toHaveBeenCalledWith('guest');
  });

  it('reports empty when the ayah has no notes', async () => {
    const { result } = await renderHook(() => useAyahNotes('guest', AYAH), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.state.status).toBe('empty'));
  });

  it('keeps each namespace in its own cache entry', async () => {
    const wrapper = makeWrapper(client);
    service.list.mockResolvedValueOnce([]);

    const a = await renderHook(() => useAyahNotes('user:a', AYAH), { wrapper });
    await waitFor(() => expect(a.result.current.state.status).toBe('empty'));

    service.list.mockResolvedValue([{ ...NOTE, id: 'b1', text: 'b note' }]);
    const b = await renderHook(() => useAyahNotes('user:b', AYAH), { wrapper });
    await waitFor(() => expect(b.result.current.state.status).toBe('ready'));

    // The second read did not reuse the first namespace's cached empty list.
    expect(service.list).toHaveBeenCalledTimes(2);
    expect(service.list).toHaveBeenLastCalledWith('user:b');
    expect(client.getQueryData(queryKeys.notes.byAyah('user:a', 1))).toEqual(
      [],
    );
    expect(client.getQueryData(queryKeys.notes.byAyah('user:b', 1))).toEqual([
      { ...NOTE, id: 'b1', text: 'b note' },
    ]);
  });

  it('shows an optimistic note before the write resolves', async () => {
    let resolveSave: (note: QuranNote) => void = () => undefined;
    const gate = new Promise<QuranNote>((resolve) => {
      resolveSave = resolve;
    });

    service.save.mockReturnValue(gate);

    const { result } = await renderHook(() => useAyahNotes('guest', AYAH), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(result.current.state.status).toBe('empty'));

    let write: Promise<QuranNote> | null = null;
    await act(async () => {
      write = result.current.add('  memorize  ');
    });

    // Still pending, but the row is already in the list.
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    if (result.current.state.status !== 'ready') throw new Error('unreachable');
    expect(result.current.state.data).toHaveLength(1);
    expect(result.current.state.data[0]).toMatchObject({
      ayah: AYAH,
      text: 'memorize',
    });

    const optimistic =
      result.current.state.status === 'ready'
        ? result.current.state.data[0]
        : NOTE;

    await act(async () => {
      resolveSave(optimistic);
      await write;
    });

    await waitFor(() => expect(result.current.isAdding).toBe(false));
    expect(service.save).toHaveBeenCalledWith(
      'guest',
      expect.objectContaining({ text: 'memorize' }),
    );
  });

  it('rolls back a rejected write and retries with the same id', async () => {
    service.save.mockRejectedValueOnce(new Error('disk full'));

    const { result } = await renderHook(() => useAyahNotes('guest', AYAH), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(result.current.state.status).toBe('empty'));

    await act(async () => {
      await expect(result.current.add('retry me')).rejects.toThrow('disk full');
    });

    // The failed row is gone, and the failure is exposed for the composer.
    expect(result.current.state.status).toBe('empty');
    expect(result.current.addError).toBeInstanceOf(Error);

    await act(async () => {
      await result.current.add('retry me');
    });

    const first = service.save.mock.calls[0][1] as QuranNote;
    const second = service.save.mock.calls[1][1] as QuranNote;

    expect(second.id).toBe(first.id);
    expect(second.text).toBe(first.text);
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
  });

  it('does not show a write started for one account under another account', async () => {
    let resolveSave: (note: QuranNote) => void = () => undefined;
    const gate = new Promise<QuranNote>((resolve) => {
      resolveSave = resolve;
    });

    service.save.mockReturnValue(gate);

    const wrapper = makeWrapper(client);
    const { result, rerender } = await renderHook(
      (props: { namespace: string }) => useAyahNotes(props.namespace, AYAH),
      { wrapper, initialProps: { namespace: 'user:a' } },
    );
    await waitFor(() => expect(result.current.state.status).toBe('empty'));

    let write: Promise<QuranNote> | null = null;
    await act(async () => {
      write = result.current.add('account a note');
    });
    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    // The account changes while the write is still in flight.
    await rerender({ namespace: 'user:b' });
    await waitFor(() => expect(result.current.state.status).toBe('empty'));

    const optimistic = client.getQueryData<QuranNote[]>(
      queryKeys.notes.byAyah('user:a', 1),
    );

    expect(optimistic).toHaveLength(1);

    await act(async () => {
      resolveSave(optimistic?.[0] ?? NOTE);
      await write;
    });

    // The other account's list never inherits the first account's note.
    expect(result.current.state.status).toBe('empty');
    expect(client.getQueryData(queryKeys.notes.byAyah('user:b', 1))).toEqual(
      [],
    );
  });

  it('does not carry a failed note identity to a different ayah', async () => {
    service.save.mockRejectedValueOnce(new Error('disk full'));

    const wrapper = makeWrapper(client);
    const { result, rerender } = await renderHook(
      (props: { ayah: NoteAyah }) => useAyahNotes('guest', props.ayah),
      { wrapper, initialProps: { ayah: AYAH } },
    );
    await waitFor(() => expect(result.current.state.status).toBe('empty'));

    await act(async () => {
      await expect(result.current.add('same text')).rejects.toThrow(
        'disk full',
      );
    });

    await rerender({ ayah: OTHER_AYAH });
    await waitFor(() => expect(result.current.state.status).toBe('empty'));

    await act(async () => {
      await result.current.add('same text');
    });

    const notes = service.save.mock.calls.map((call) => call[1] as QuranNote);

    expect(notes[0].ayah).toEqual(AYAH);
    expect(notes[1].ayah).toEqual(OTHER_AYAH);
    expect(notes[1].id).not.toBe(notes[0].id);
  });
});
