import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { QuranEdition, SurahMetadata } from '@/core/types';
import { AyahPanelSheet } from '../components/ayah-panel-sheet';
import { EditionPickerSheet } from '../components/edition-picker-sheet';
import { ReaderMenuSheet } from '../components/reader-menu-sheet';
import { SurahPickerSheet } from '../components/surah-picker-sheet';

/**
 * Sheet contents.
 *
 * `@expo/ui`'s `BottomSheet` is a native presentation surface; what these
 * tests care about is the rows, the search and the callbacks. The mock renders
 * children only while the sheet is presented, which also pins down that a
 * closed picker is not interactive.
 */
jest.mock('@expo/ui', () => ({
  BottomSheet: ({
    isPresented,
    children,
  }: {
    isPresented?: boolean;
    children?: ReactNode;
  }) => (isPresented ? children : null),
}));

const SURAHS: Record<string, SurahMetadata> = {
  '2': {
    number: 2,
    name: 'البقرة',
    nameEnglish: 'Al-Baqarah',
    location: 'madina',
    ayahCount: 286,
  },
  '3': {
    number: 3,
    name: 'آل عمران',
    nameEnglish: "Ali 'Imran",
    location: 'madina',
    ayahCount: 200,
  },
  '114': {
    number: 114,
    name: 'الناس',
    nameEnglish: 'An-Nas',
    location: 'makka',
    ayahCount: 6,
  },
};

const EDITIONS: Record<string, QuranEdition> = {
  '1': {
    key: '1',
    name: 'Tajweed',
    riwaya: 'hafs',
    baseUrl: 'https://cdn.test/1',
    bboxUrl: 'https://cdn.test/1/bbox.json',
    bboxReversedUrl: 'https://cdn.test/1/bbox_reversed.json',
    bboxNormUrl: 'https://cdn.test/1/bbox_norm.json',
    bboxReversedNormUrl: 'https://cdn.test/1/bbox_reversed_norm.json',
    firstPage: 1,
    lastPage: 604,
    themeColor: '#FFFFD7',
  },
  '2': {
    key: '2',
    name: 'MedinaOld',
    riwaya: 'warsh',
    baseUrl: 'https://cdn.test/2',
    bboxUrl: 'https://cdn.test/2/bbox.json',
    bboxReversedUrl: 'https://cdn.test/2/bbox_reversed.json',
    bboxNormUrl: 'https://cdn.test/2/bbox_norm.json',
    bboxReversedNormUrl: 'https://cdn.test/2/bbox_reversed_norm.json',
    firstPage: 4,
    lastPage: 605,
    themeColor: '#FFFFD7',
  },
};

describe('SurahPickerSheet', () => {
  function renderPicker(
    overrides: Partial<Parameters<typeof SurahPickerSheet>[0]> = {},
  ) {
    const onSelect = jest.fn();
    const onDismiss = jest.fn();

    return {
      onSelect,
      onDismiss,
      view: render(
        <SurahPickerSheet
          isPresented
          surahs={SURAHS}
          currentSurah={2}
          onDismiss={onDismiss}
          onSelect={onSelect}
          {...overrides}
        />,
      ),
    };
  }

  it('lists the catalog in mushaf order', async () => {
    await renderPicker().view;

    expect(screen.getByTestId('surah-row:2')).toBeTruthy();
    expect(screen.getByTestId('surah-row:3')).toBeTruthy();
    expect(screen.getByTestId('surah-row:114')).toBeTruthy();
  });

  it('marks the current surah as selected', async () => {
    await renderPicker().view;

    expect(
      screen.getByTestId('surah-row:2').props.accessibilityState,
    ).toMatchObject({ selected: true });
    expect(
      screen.getByTestId('surah-row:3').props.accessibilityState,
    ).toMatchObject({ selected: false });
  });

  it('filters as the reader types and jumps to the chosen row', async () => {
    const { view, onSelect } = renderPicker();
    await view;

    await fireEvent.changeText(screen.getByTestId('surah-search'), 'nas');

    expect(screen.queryByTestId('surah-row:2')).toBeNull();
    expect(screen.getByTestId('surah-row:114')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('surah-row:114'));

    expect(onSelect).toHaveBeenCalledWith(114);
  });

  it('explains an empty result instead of showing the full list', async () => {
    await renderPicker().view;

    await fireEvent.changeText(
      screen.getByTestId('surah-search'),
      'no such surah',
    );

    expect(screen.getByTestId('surah-empty')).toBeTruthy();
  });

  it('starts from the full list when reopened', async () => {
    const { view: pending } = renderPicker();
    await pending;

    await fireEvent.changeText(screen.getByTestId('surah-search'), 'nas');
    await fireEvent.press(screen.getByTestId('surah-picker-close'));

    // Dismissal clears the filter, so reopening starts from all 114 rows
    // instead of the last search.
    expect(screen.getByTestId('surah-search').props.value).toBe('');
    expect(screen.getByTestId('surah-row:2')).toBeTruthy();
  });
});

describe('EditionPickerSheet', () => {
  it('summarises range and riwaya, and selects an edition', async () => {
    const onSelect = jest.fn();

    await render(
      <EditionPickerSheet
        isPresented
        editions={EDITIONS}
        currentKey="1"
        onDismiss={jest.fn()}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText('Tajweed')).toBeTruthy();
    expect(screen.getByText('Selected')).toBeTruthy();
    expect(screen.getByText('warsh · Pages 4–605')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('edition-row:2'));

    expect(onSelect).toHaveBeenCalledWith('2');
  });
});

describe('ReaderMenuSheet', () => {
  it('offers every reader destination', async () => {
    const onSelect = jest.fn();

    await render(
      <ReaderMenuSheet isPresented onDismiss={jest.fn()} onSelect={onSelect} />,
    );

    await fireEvent.press(screen.getByTestId('reader-menu-read'));
    await fireEvent.press(screen.getByTestId('reader-menu-notes'));
    await fireEvent.press(screen.getByTestId('reader-menu-audio'));
    await fireEvent.press(screen.getByTestId('reader-menu-share'));

    expect(onSelect).toHaveBeenNthCalledWith(1, 'read');
    expect(onSelect).toHaveBeenNthCalledWith(2, 'notes');
    expect(onSelect).toHaveBeenNthCalledWith(3, 'audio');
    expect(onSelect).toHaveBeenNthCalledWith(4, 'share');
    expect(screen.getByTestId('reader-menu-tafsir')).toBeTruthy();
    expect(screen.getByTestId('reader-menu-surah')).toBeTruthy();
    expect(screen.getByTestId('reader-menu-edition')).toBeTruthy();
  });
});

describe('AyahPanelSheet', () => {
  const pending = { state: { status: 'pending' as const }, isFetching: false };
  const content = {
    absoluteNumber: 262,
    text: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
    numberInSurah: 255,
    juz: 3,
    manzil: 1,
    page: 42,
    ruku: 5,
    hizbQuarter: 18,
    sajda: false,
  };
  const ready = {
    state: { status: 'ready' as const, data: content },
    isFetching: false,
  };

  it('asks for a selection when no ayah is selected', async () => {
    await render(
      <AyahPanelSheet
        panel="read"
        surah={null}
        surahName={null}
        ayahKey={null}
        content={pending}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByTestId('ayah-panel-empty')).toBeTruthy();
    expect(screen.queryByTestId('ayah-panel-pending')).toBeNull();
  });

  it('keeps Tafsir honest until its own package lands', async () => {
    await render(
      <AyahPanelSheet
        panel="tafsir"
        surah={2}
        surahName="Al-Baqarah"
        ayahKey="255"
        content={ready}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByText('Tafsir')).toBeTruthy();
    expect(screen.getByTestId('ayah-panel-identity').props.children).toContain(
      'Al-Baqarah',
    );
    expect(screen.getByTestId('ayah-panel-pending')).toBeTruthy();
    expect(screen.queryByTestId('ayah-content')).toBeNull();
  });

  it('renders the selected ayah text in the Read panel', async () => {
    await render(
      <AyahPanelSheet
        panel="read"
        surah={2}
        surahName="Al-Baqarah"
        ayahKey="255"
        content={ready}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByTestId('ayah-panel-content')).toBeTruthy();
    expect(screen.getByTestId('ayah-block:quran').props.children).toContain(
      content.text,
    );
  });

  it('shows loading and a retryable failure instead of empty text', async () => {
    const view = await render(
      <AyahPanelSheet
        panel="read"
        surah={2}
        surahName="Al-Baqarah"
        ayahKey="255"
        content={pending}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByTestId('ayah-panel-loading')).toBeTruthy();

    const retry = jest.fn();
    await view.rerender(
      <AyahPanelSheet
        panel="read"
        surah={2}
        surahName="Al-Baqarah"
        ayahKey="255"
        content={{
          state: { status: 'error', error: new Error('offline'), retry },
          isFetching: false,
        }}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    await fireEvent.press(screen.getByText('Try again'));

    expect(retry).toHaveBeenCalledTimes(1);
  });
});
