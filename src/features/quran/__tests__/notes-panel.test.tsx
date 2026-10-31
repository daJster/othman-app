import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import type { NoteAyah, QuranNote } from '@/core/domain/notes/notes';
import type { AsyncState } from '@/features/query/async-state';
import { NotesPanel } from '../components/notes-panel';
import type { NotesController } from '../use-notes';

/**
 * The Notes panel's contract.
 *
 * Persistence and cache reconciliation are covered by the repository and
 * `use-notes` tests. What matters here is the surface: all four honest states,
 * a composer that keeps the draft until persistence succeeds, and a save that
 * cannot run twice while one is in flight.
 */
let mockController: NotesController;

jest.mock('../use-notes', () => ({
  useAyahNotes: () => mockController,
}));

const AYAH: NoteAyah = { surah: 2, ayah: 255, absoluteNumber: 262 };

const NOTE: QuranNote = {
  id: 'n1',
  ayah: AYAH,
  text: 'memorize this',
  createdAt: 1_700_000_000_000,
};

function controller(
  state: AsyncState<QuranNote[]>,
  overrides: Partial<NotesController> = {},
): NotesController {
  return {
    state,
    add: jest.fn(async () => NOTE),
    isAdding: false,
    addError: null,
    ...overrides,
  };
}

beforeEach(() => {
  mockController = controller({ status: 'empty' });
});

describe('NotesPanel', () => {
  it('renders nothing without a selected ayah', async () => {
    await render(<NotesPanel namespace="guest" ayah={null} />);

    expect(screen.queryByTestId('notes-panel')).toBeNull();
  });

  it('shows loading while the ayah notes are pending', async () => {
    mockController = controller({ status: 'pending' });

    await render(<NotesPanel namespace="guest" ayah={AYAH} />);

    expect(screen.getByTestId('notes-loading')).toBeTruthy();
    expect(screen.queryByTestId('notes-empty')).toBeNull();
  });

  it('shows a recoverable error and retries the query', async () => {
    const retry = jest.fn();
    mockController = controller({
      status: 'error',
      error: new Error('disk'),
      retry,
    });

    await render(<NotesPanel namespace="guest" ayah={AYAH} />);
    await fireEvent.press(screen.getByText('Try again'));

    expect(retry).toHaveBeenCalled();
  });

  it('shows the empty state when the ayah has no notes', async () => {
    await render(<NotesPanel namespace="guest" ayah={AYAH} />);

    expect(screen.getByTestId('notes-empty')).toBeTruthy();
  });

  it('renders every note for the selected ayah in the virtualized list', async () => {
    mockController = controller({
      status: 'ready',
      data: [NOTE, { ...NOTE, id: 'n2', text: 'second' }],
    });

    await render(<NotesPanel namespace="guest" ayah={AYAH} />);

    expect(screen.getByText('memorize this')).toBeTruthy();
    expect(screen.getByText('second')).toBeTruthy();
  });

  it('clears the draft only after the write succeeds', async () => {
    let resolveAdd: (note: QuranNote) => void = () => undefined;
    const gate = new Promise<QuranNote>((resolve) => {
      resolveAdd = resolve;
    });
    const add = jest.fn(() => gate);
    mockController = controller({ status: 'empty' }, { add });

    await render(<NotesPanel namespace="guest" ayah={AYAH} />);

    await fireEvent.changeText(
      screen.getByTestId('notes-draft'),
      '  new note  ',
    );
    await fireEvent.press(screen.getByTestId('notes-save'));

    expect(add).toHaveBeenCalledWith('  new note  ');
    // While the write is in flight the draft is still there.
    expect(screen.getByTestId('notes-draft').props.value).toBe('  new note  ');

    resolveAdd(NOTE);

    await waitFor(() =>
      expect(screen.getByTestId('notes-draft').props.value).toBe(''),
    );
  });

  it('keeps the draft when persistence rejects', async () => {
    const add = jest.fn(async () => {
      throw new Error('disk full');
    });
    mockController = controller({ status: 'empty' }, { add });

    await render(<NotesPanel namespace="guest" ayah={AYAH} />);

    await fireEvent.changeText(screen.getByTestId('notes-draft'), 'keep me');
    await fireEvent.press(screen.getByTestId('notes-save'));

    await waitFor(() => expect(add).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByTestId('notes-draft').props.value).toBe('keep me'),
    );
  });

  it('shows the save error without discarding the draft', async () => {
    mockController = controller(
      { status: 'empty' },
      { addError: new Error('disk full') },
    );

    await render(<NotesPanel namespace="guest" ayah={AYAH} />);

    expect(screen.getByTestId('notes-save-error')).toBeTruthy();
  });

  it('disables save for a blank draft', async () => {
    await render(<NotesPanel namespace="guest" ayah={AYAH} />);

    await fireEvent.changeText(screen.getByTestId('notes-draft'), '   ');
    await fireEvent.press(screen.getByTestId('notes-save'));

    expect(mockController.add).not.toHaveBeenCalled();
    expect(screen.getByTestId('notes-save').props.accessibilityState).toEqual({
      disabled: true,
    });
  });

  it('does not submit while a write is in flight', async () => {
    mockController = controller({ status: 'empty' }, { isAdding: true });

    await render(<NotesPanel namespace="guest" ayah={AYAH} />);

    await fireEvent.changeText(screen.getByTestId('notes-draft'), 'draft');
    await fireEvent.press(screen.getByTestId('notes-save'));

    expect(mockController.add).not.toHaveBeenCalled();
    expect(screen.getByTestId('notes-save').props.accessibilityState).toEqual({
      disabled: true,
    });
  });
});
