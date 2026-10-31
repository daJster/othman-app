import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { SurahMetadata } from '@/core/types';
import { i18n, setLanguageState } from '@/i18n';
import { ReaderFooter } from '../components/reader-footer';
import { ReaderHeader } from '../components/reader-header';

/**
 * The chrome's contract.
 *
 * Header and footer are tested as components rather than through the reader:
 * the screen test is already long, and what matters here is the label logic —
 * surah name, page, selected ayah, and the reading-order actions — plus the
 * fact that a boundary control is disabled instead of disappearing.
 */

const SURAH: SurahMetadata = {
  number: 2,
  name: 'البقرة',
  nameEnglish: 'Al-Baqarah',
  location: 'madina',
  ayahCount: 286,
};

async function resetLanguage() {
  await act(async () => {
    setLanguageState({ language: 'en', ready: true });
    await i18n.changeLanguage('en');
  });
}

beforeEach(async () => {
  await resetLanguage();
});

afterEach(async () => {
  await resetLanguage();
});

function renderHeader(
  overrides: Partial<Parameters<typeof ReaderHeader>[0]> = {},
) {
  const handlers = {
    onExit: jest.fn(),
    onOpenSurah: jest.fn(),
    onOpenEditions: jest.fn(),
    onOpenMenu: jest.fn(),
  };

  return {
    handlers,
    view: render(
      <ReaderHeader
        surah={SURAH}
        ayahKey={null}
        page={12}
        editionName="Tajweed"
        {...handlers}
        {...overrides}
      />,
    ),
  };
}

describe('ReaderHeader', () => {
  it('shows the surah name and the page position', async () => {
    await renderHeader().view;

    expect(screen.getByText('Al-Baqarah')).toBeTruthy();
    expect(screen.getByText('Page 12')).toBeTruthy();
    expect(screen.queryByText(/Ayah/)).toBeNull();
  });

  it('adds the ayah once one is selected, keeping the page', async () => {
    await renderHeader({ ayahKey: '255' }).view;

    expect(screen.getByText('Page 12 · Ayah 255')).toBeTruthy();
  });

  it('tracks a page turn', async () => {
    const { view: pending } = renderHeader();
    const view = await pending;

    await view.rerender(
      <ReaderHeader
        surah={SURAH}
        ayahKey={null}
        page={13}
        editionName="Tajweed"
        onExit={jest.fn()}
        onOpenSurah={jest.fn()}
        onOpenEditions={jest.fn()}
        onOpenMenu={jest.fn()}
      />,
    );

    expect(screen.getByText('Page 13')).toBeTruthy();
    expect(screen.queryByText('Page 12')).toBeNull();
  });

  it('exposes exit, surah, edition and menu actions', async () => {
    const { view, handlers } = renderHeader();
    await view;

    await fireEvent.press(screen.getByTestId('reader-back'));
    await fireEvent.press(screen.getByTestId('reader-surah'));
    await fireEvent.press(screen.getByTestId('reader-edition'));
    await fireEvent.press(screen.getByTestId('reader-menu'));

    expect(handlers.onExit).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenSurah).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenEditions).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenMenu).toHaveBeenCalledTimes(1);
  });

  it('labels every action for a screen reader', async () => {
    await renderHeader().view;

    expect(screen.getByTestId('reader-back').props.accessibilityLabel).toBe(
      'Exit reader',
    );
    expect(screen.getByTestId('reader-surah').props.accessibilityLabel).toBe(
      'Choose surah',
    );
    expect(screen.getByTestId('reader-edition').props.accessibilityLabel).toBe(
      'Choose edition',
    );
    expect(screen.getByTestId('reader-menu').props.accessibilityLabel).toBe(
      'Reader menu',
    );
  });

  it('uses the Arabic name and labels in an RTL UI', async () => {
    await act(async () => {
      setLanguageState({ language: 'ar', ready: true });
      await i18n.changeLanguage('ar');
    });

    await renderHeader({ ayahKey: '255' }).view;

    const ar = (value: number) => new Intl.NumberFormat('ar').format(value);

    expect(screen.getByText('البقرة')).toBeTruthy();
    expect(screen.getByText(`صفحة ${ar(12)} · الآية ${ar(255)}`)).toBeTruthy();
    expect(screen.getByTestId('reader-back').props.accessibilityLabel).toBe(
      'الخروج من المصحف',
    );
  });
});

describe('ReaderFooter', () => {
  function renderFooter(
    overrides: Partial<Parameters<typeof ReaderFooter>[0]> = {},
  ) {
    const onPrevious = jest.fn();
    const onNext = jest.fn();

    return {
      onPrevious,
      onNext,
      view: render(
        <ReaderFooter
          page={12}
          firstPage={1}
          lastPage={604}
          onPrevious={onPrevious}
          onNext={onNext}
          {...overrides}
        />,
      ),
    };
  }

  it('turns both ways through the reading order', async () => {
    const { view, onPrevious, onNext } = renderFooter();
    await view;

    await fireEvent.press(screen.getByTestId('reader-prev'));
    await fireEvent.press(screen.getByTestId('reader-next'));

    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('renders the position with tabular numerals', async () => {
    await renderFooter().view;

    const counter = screen.getByText('12 / 604');

    expect(String(counter.props.className)).toContain('tabular-nums');
  });

  it('disables previous on the first page of an edition', async () => {
    await renderFooter({ page: 4, firstPage: 4 }).view;

    expect(
      screen.getByTestId('reader-prev').props.accessibilityState,
    ).toMatchObject({ disabled: true });
    expect(
      screen.getByTestId('reader-next').props.accessibilityState,
    ).toMatchObject({ disabled: false });
  });

  it('disables next on the last page of an edition', async () => {
    await renderFooter({ page: 604, firstPage: 4, lastPage: 604 }).view;

    expect(
      screen.getByTestId('reader-next').props.accessibilityState,
    ).toMatchObject({ disabled: true });
    expect(
      screen.getByTestId('reader-prev').props.accessibilityState,
    ).toMatchObject({ disabled: false });
  });

  it('switches labels, not direction, for Arabic', async () => {
    await act(async () => {
      setLanguageState({ language: 'ar', ready: true });
      await i18n.changeLanguage('ar');
    });

    const { view, onNext } = renderFooter();
    await view;

    expect(screen.getByText('الصفحة التالية')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('reader-next'));

    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
