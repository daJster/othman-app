import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type {
  ContentBody,
  ContentSource,
  SurahInfoSection,
} from '@/core/types';
import type { AsyncResult, AsyncState } from '@/features/query/async-state';
import { TafsirPanel } from '../components/tafsir-panel';
import type { TafsirPanelController } from '../use-tafsir';

/**
 * Content panel surface.
 *
 * Query identity is covered by `use-tafsir.test.tsx`; these cases pin the four
 * honest states per surface, retry, source direction, and that a type change is
 * requested through the controller rather than kept locally.
 */
let mockPanel: TafsirPanelController;

jest.mock('../use-tafsir', () => ({
  useTafsirPanel: () => mockPanel,
}));

jest.mock('@expo/ui', () => {
  const { Pressable } = require('react-native');

  function MockPicker({
    children,
    onValueChange,
    testID,
  }: {
    children?: ReactNode;
    selectedValue: string | number;
    onValueChange: (value: string | number) => void;
    testID?: string;
  }) {
    return (
      <Pressable
        testID={testID}
        onPress={() => onValueChange(testID === 'tafsir-type' ? 'surah' : 180)}
      >
        {children}
      </Pressable>
    );
  }

  function MockPickerItem() {
    return null;
  }

  MockPicker.Item = MockPickerItem;

  return {
    Host: ({ children }: { children?: ReactNode }) => <>{children}</>,
    RNHostView: ({ children }: { children?: ReactNode }) => <>{children}</>,
    Column: ({ children }: { children?: ReactNode }) => <>{children}</>,
    Picker: MockPicker,
  };
});

const AYAH = { surah: 2, ayah: 262, absoluteNumber: 269 };

const SOURCE: ContentSource = {
  id: 3,
  name: 'تيسير الكريم الرحمن',
  author: 'السعدي',
  category: 'كتب التفسير',
};

const READY_BODY: ContentBody = {
  status: 'ready',
  text: 'هذا نص التفسير',
  direction: 'rtl',
};

const SECTIONS: SurahInfoSection[] = [
  { key: 'introduction', title: 'نبذة', text: 'سورة البقرة' },
];

function result<T>(state: AsyncState<T>): AsyncResult<T> {
  return { state, isFetching: false };
}

function controller(
  overrides: Partial<TafsirPanelController> = {},
): TafsirPanelController {
  return {
    type: 'tafsir',
    setType: jest.fn(),
    sourceId: 3,
    setSourceId: jest.fn(),
    selectedSource: SOURCE,
    sources: result({ status: 'ready', data: [SOURCE] }),
    retrySources: jest.fn(),
    content: result({ status: 'ready', data: READY_BODY }),
    surahInfo: result({ status: 'ready', data: SECTIONS }),
    ...overrides,
  };
}

beforeEach(() => {
  mockPanel = controller();
});

describe('TafsirPanel', () => {
  it('asks for a selection when no ayah is selected', async () => {
    await render(<TafsirPanel ayah={null} />);

    expect(screen.getByTestId('tafsir-needs-selection')).toBeTruthy();
    expect(screen.queryByTestId('tafsir-panel')).toBeNull();
  });

  it('shows loading while the source options are pending', async () => {
    mockPanel = controller({ sources: result({ status: 'pending' }) });

    await render(<TafsirPanel ayah={AYAH} />);

    expect(screen.getByTestId('tafsir-loading')).toBeTruthy();
  });

  it('retries a failed source list', async () => {
    const retry = jest.fn();
    mockPanel = controller({
      sources: result({ status: 'error', error: new Error('x'), retry }),
    });

    await render(<TafsirPanel ayah={AYAH} />);
    await fireEvent.press(screen.getByText('Try again'));

    expect(retry).toHaveBeenCalled();
  });

  it('shows an empty source list without requesting content', async () => {
    mockPanel = controller({
      sourceId: null,
      selectedSource: null,
      sources: result({ status: 'empty' }),
      content: result({ status: 'pending' }),
    });

    await render(<TafsirPanel ayah={AYAH} />);

    expect(screen.getByTestId('tafsir-sources-empty')).toBeTruthy();
    expect(screen.queryByTestId('tafsir-content')).toBeNull();
  });

  it('shows loading while a selected source body is pending', async () => {
    mockPanel = controller({ content: result({ status: 'pending' }) });

    await render(<TafsirPanel ayah={AYAH} />);

    expect(screen.getByTestId('tafsir-loading')).toBeTruthy();
  });

  it('retries a failed body', async () => {
    const retry = jest.fn();
    mockPanel = controller({
      content: result({ status: 'error', error: new Error('x'), retry }),
    });

    await render(<TafsirPanel ayah={AYAH} />);
    await fireEvent.press(screen.getByText('Try again'));

    expect(retry).toHaveBeenCalled();
  });

  it('shows a legitimate empty body as empty, not as text', async () => {
    mockPanel = controller({
      content: result({ status: 'empty' }),
    });

    await render(<TafsirPanel ayah={AYAH} />);

    expect(screen.getByTestId('tafsir-empty')).toBeTruthy();
    expect(screen.queryByTestId('tafsir-content')).toBeNull();
  });

  it('renders selectable text with the source direction', async () => {
    await render(<TafsirPanel ayah={AYAH} />);

    const content = screen.getByTestId('tafsir-content');
    const text = screen.getByText('هذا نص التفسير');

    expect(content).toBeTruthy();
    expect(text.props.selectable).toBe(true);
    expect(text.props.style).toMatchObject({
      writingDirection: 'rtl',
      textAlign: 'right',
    });
  });

  it('keeps an ltr translation ltr', async () => {
    mockPanel = controller({
      type: 'translation',
      content: result({
        status: 'ready',
        data: {
          status: 'ready',
          text: 'English translation',
          direction: 'ltr',
        },
      }),
    });

    await render(<TafsirPanel ayah={AYAH} />);

    expect(screen.getByText('English translation').props.style).toMatchObject({
      writingDirection: 'ltr',
      textAlign: 'left',
    });
  });

  it('requests a type change through the controller', async () => {
    await render(<TafsirPanel ayah={AYAH} />);

    await fireEvent.press(screen.getByTestId('tafsir-type'));

    expect(mockPanel.setType).toHaveBeenCalledWith('surah');
  });

  it('renders surah information sections for the surah type', async () => {
    mockPanel = controller({ type: 'surah', sourceId: null });

    await render(<TafsirPanel ayah={AYAH} />);

    expect(screen.getByText('نبذة')).toBeTruthy();
    expect(
      screen.getByTestId('tafsir-surah-section:introduction'),
    ).toBeTruthy();
    expect(screen.queryByTestId('tafsir-source')).toBeNull();
  });

  it('retries failed surah information', async () => {
    const retry = jest.fn();
    mockPanel = controller({
      type: 'surah',
      surahInfo: result({ status: 'error', error: new Error('x'), retry }),
    });

    await render(<TafsirPanel ayah={AYAH} />);
    await fireEvent.press(screen.getByText('Try again'));

    expect(retry).toHaveBeenCalled();
  });
});
