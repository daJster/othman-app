import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { SurahMetadata } from '@/core/types';
import { useDirection } from '@/i18n';
import { useThemeMode } from '@/providers/theme-provider';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Pressable } from '@/ui/pressable';
import { Text } from '@/ui/text';
import { formatReaderNumber } from '../format';

/**
 * The reader's top chrome.
 *
 * Five decisions are worth stating because they are easy to regress:
 *
 *  - **Inset, not overlay.** The header is a row in the column above the page,
 *    so it can never cover the scan. A floating header looks better in a
 *    screenshot and hides the first line of the mushaf on a phone.
 *  - **Surah and ayah are one control.** The title is the way into the surah
 *    picker, and the second line always carries the page plus — once one is
 *    selected — the ayah. That way a page turn and a bbox tap both produce a
 *    visible label change without adding a status bar.
 *  - **Theme is one tap, not a menu.** Day/night is the chrome change a reader
 *    makes most, so it gets a direct ghost button showing the theme it will
 *    switch to. The three-way choice (including "follow the system") remains
 *    on Account; the reader never makes anyone open a sheet to keep reading.
 *  - **The mushaf picker is not here.** Choosing a print (Tajweed, Warsh,
 *    MedinaOld) is a rare, deliberate change, so it stays in the bottom
 *    drawer with the other destinations; the top row is only what a page turn
 *    needs. The surah name is the identity the reader is tracking, not the
 *    print's.
 *  - **The exit control is labelled, not just an icon — when it exists.** A
 *    full-screen modal has no system back gesture on iOS, so the reader's only
 *    way out has to be discoverable and screen-reader labelled. It dismisses
 *    with an X, the same shape as every other modal, rather than a back
 *    chevron. The embedded reader (the Quran tab) renders no exit at all: the
 *    tab bar is the way out, and a dead button would be worse than none.
 *
 * Only the footer's previous/next arrows mirror in RTL because they are
 * reading-order actions; dismissals do not.
 */
export type ReaderHeaderProps = {
  surah: SurahMetadata | null;
  ayahKey: string | null;
  page: number;
  /** Omitted when the reader is a tab's own screen and cannot be dismissed. */
  onExit?: () => void;
  onOpenSurah: () => void;
  onOpenMenu: () => void;
};

export function ReaderHeader({
  surah,
  ayahKey,
  page,
  onExit,
  onOpenSurah,
  onOpenMenu,
}: ReaderHeaderProps) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const { isDark, setMode } = useThemeMode();
  const nextTheme = isDark ? 'light' : 'dark';

  const surahName = surah
    ? language === 'ar'
      ? surah.name
      : surah.nameEnglish
    : t('nav.quran');

  const position = t('reader.pageIndicator', {
    page: formatReaderNumber(page, language),
  });
  const ayah = ayahKey
    ? t('reader.ayahIndicator', {
        ayah: formatReaderNumber(Number(ayahKey), language),
      })
    : null;

  return (
    <View
      className="flex-row items-center gap-2 border-b border-glass-edge bg-glass px-2 pb-2"
      testID="reader-header"
    >
      {onExit ? (
        <Button
          variant="ghost"
          size="icon"
          accessibilityLabel={t('reader.exit')}
          onPress={onExit}
          testID="reader-back"
        >
          <Icon name="close" size={20} />
        </Button>
      ) : null}

      <Pressable
        className="min-w-0 flex-1 gap-0.5 py-1"
        accessibilityRole="button"
        accessibilityLabel={t('reader.openSurahPicker')}
        onPress={onOpenSurah}
        testID="reader-surah"
      >
        <Text variant="label" numberOfLines={1}>
          {surahName}
        </Text>
        <Text
          variant="caption"
          tone="muted"
          className="tabular-nums"
          numberOfLines={1}
        >
          {ayah ? `${position} · ${ayah}` : position}
        </Text>
      </Pressable>

      <Button
        variant="ghost"
        size="icon"
        accessibilityLabel={t(
          isDark ? 'theme.switchToLight' : 'theme.switchToDark',
        )}
        onPress={() => setMode(nextTheme)}
        testID="reader-theme-toggle"
      >
        <Icon name={isDark ? 'sun' : 'moon'} size={20} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        accessibilityLabel={t('reader.openMenu')}
        onPress={onOpenMenu}
        testID="reader-menu"
      >
        <Icon name="menu" size={20} />
      </Button>
    </View>
  );
}
