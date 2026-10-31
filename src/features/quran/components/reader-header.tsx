import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { SurahMetadata } from '@/core/types';
import { useDirection } from '@/i18n';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Pressable } from '@/ui/pressable';
import { Text } from '@/ui/text';
import { formatReaderNumber } from '../format';

/**
 * The reader's top chrome.
 *
 * Three decisions are worth stating because they are easy to regress:
 *
 *  - **Inset, not overlay.** The header is a row in the column above the page,
 *    so it can never cover the scan. A floating header looks better in a
 *    screenshot and hides the first line of the mushaf on a phone.
 *  - **Surah and ayah are one control.** The title is the way into the surah
 *    picker, and the second line always carries the page plus — once one is
 *    selected — the ayah. That way a page turn and a bbox tap both produce a
 *    visible label change without adding a status bar.
 *  - **The exit control is labelled, not just an icon.** A full-screen modal has
 *    no system back gesture on iOS, so the reader's only way out has to be
 *    discoverable and screen-reader labelled.
 *
 * Icons mirror in RTL by swapping the chevron, not by reversing the row:
 * `flex-row` already follows the document direction.
 */
export type ReaderHeaderProps = {
  surah: SurahMetadata | null;
  ayahKey: string | null;
  page: number;
  editionName: string | null;
  onExit: () => void;
  onOpenSurah: () => void;
  onOpenEditions: () => void;
  onOpenMenu: () => void;
};

export function ReaderHeader({
  surah,
  ayahKey,
  page,
  editionName,
  onExit,
  onOpenSurah,
  onOpenEditions,
  onOpenMenu,
}: ReaderHeaderProps) {
  const { t } = useTranslation();
  const { language, isRTL } = useDirection();

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
      className="flex-row items-center gap-2 border-b border-border bg-background px-2 pt-safe pb-2"
      testID="reader-header"
    >
      <Button
        variant="ghost"
        size="icon"
        accessibilityLabel={t('reader.exit')}
        onPress={onExit}
        testID="reader-back"
      >
        <Icon name={isRTL ? 'chevron-right' : 'chevron-left'} size={20} />
      </Button>

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

      {editionName ? (
        <Button
          variant="outline"
          size="sm"
          label={editionName}
          accessibilityLabel={t('reader.openEditionPicker')}
          onPress={onOpenEditions}
          testID="reader-edition"
        />
      ) : null}

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
