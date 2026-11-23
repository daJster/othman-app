import { ThemedBottomSheet } from '@/ui/themed-bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import type { QuranEdition } from '@/core/types';
import { quranPageImageUrl } from '@/core/domain/quran/page';
import { useDirection } from '@/i18n';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { NativeSheetContent } from '@/ui/native-sheet-content';
import { Pressable } from '@/ui/pressable';
import { SheetHeader } from '@/ui/sheet-header';
import { Text } from '@/ui/text';
import { formatReaderNumber } from '../format';

/**
 * Mushaf picker and summary.
 *
 * The product calls these "mushafs" (Tajweed, Warsh, MedinaOld are different
 * prints to read from); the data layer keeps the CDN's own word, `edition`,
 * because that is what `editions.json` keys and what every repository parses.
 *
 * Each row leads with the print itself: the opening page of that edition as a
 * background scan, cropped to its top edge, so "Tajweed" and "MedinaOld" are
 * recognisable before the reader reads the label. The name sits **top-left on a
 * compact canopy plate** — the page head is bright cream, so white text needs
 * its own ground there — while the card's own shadow stays weighted to the
 * bottom, where the next sheet tucks underneath.
 *
 * The rows stack like a drawer of loose sheets: the bottom corners are square
 * and each card slides a little behind the next, so the stack reads as one
 * accordion rather than three separate tiles. The soft shadow of the card
 * above falls on the exposed page edge underneath, which is what gives the
 * stack its depth.
 *
 * The count is the total (`604 pages`), not the range: every print is complete,
 * and "pages 1–604" spends the line on the one number the reader already
 * assumes. The range still matters as a clamp rule, but that is the reader's
 * business, not the picker's.
 *
 * Choosing a row only *requests* the edition. The reader fetches that edition's
 * geometry first and attaches it atomically; rendering the new name here before
 * its boxes exist would label the old scan with the new edition.
 */
export type EditionPickerSheetProps = {
  isPresented: boolean;
  editions: Readonly<Record<string, QuranEdition>>;
  currentKey: string | null;
  onDismiss: () => void;
  onSelect: (editionKey: string) => void;
};

/** How far each sheet slides behind the one below it.
 * Larger than the top radius, so a previous card's border cannot show through
 * the next card's rounded corner notches. */
const OVERLAP = 20;

/** Soft, wide shadow under the card (DESIGN.md: elevation is a soft wash). */
const CARD_SHADOW = {
  shadowColor: '#000000',
  shadowOpacity: 0.42,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  elevation: 10,
  ...Platform.select({
    web: { boxShadow: '0 8px 12px rgba(0,0,0,0.42)' },
  }),
} as const;

export function EditionPickerSheet({
  isPresented,
  editions,
  currentKey,
  onDismiss,
  onSelect,
}: EditionPickerSheetProps) {
  const { t } = useTranslation();

  const rows = useMemo(
    () => Object.values(editions).sort((a, b) => a.key.localeCompare(b.key)),
    [editions],
  );

  return (
    <ThemedBottomSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      testID="edition-picker-sheet"
    >
      <NativeSheetContent>
        <View className="gap-3">
          <SheetHeader
            title={t('reader.mushafPickerTitle')}
            onClose={onDismiss}
            closeTestID="edition-picker-close"
          />

          <View>
            {rows.map((edition, index) => (
              <MushafRow
                key={edition.key}
                edition={edition}
                index={index}
                selected={edition.key === currentKey}
                onSelect={onSelect}
              />
            ))}
          </View>
        </View>
      </NativeSheetContent>
    </ThemedBottomSheet>
  );
}

type MushafRowProps = {
  edition: QuranEdition;
  index: number;
  selected: boolean;
  onSelect: (editionKey: string) => void;
};

function MushafRow({ edition, index, selected, onSelect }: MushafRowProps) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const [failed, setFailed] = useState(false);

  const pages = t('reader.mushafPages', {
    count: formatReaderNumber(edition.lastPage, language),
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${edition.name} — ${edition.riwaya}, ${pages}`}
      onPress={() => onSelect(edition.key)}
      testID={`edition-row:${edition.key}`}
      className="relative h-32 overflow-hidden rounded-t-panel"
      style={[
        CARD_SHADOW,
        // Later sheets sit above the earlier ones, so each card's bottom tucks
        // behind the next and the stack reads as one accordion.
        { zIndex: index + 1 },
        index > 0 ? { marginTop: -OVERLAP } : null,
      ]}
    >
      {failed ? (
        <View className="absolute inset-0 bg-canopy" />
      ) : (
        <Image
          testID={`edition-preview:${edition.key}`}
          source={{ uri: quranPageImageUrl(edition, edition.firstPage) }}
          contentFit="cover"
          // The opening edge is the one part of a page that names the print:
          // the illuminated head, not a strip of mid-page text.
          contentPosition="top"
          cachePolicy="memory-disk"
          transition={140}
          accessible={false}
          onError={() => setFailed(true)}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/*
       * The scrim is deliberately heavy and starts high: the name sits around
       * the middle of the card, and a light paper scan behind white text is
       * unreadable there at a gentle fade. It is a canopy wash, not a gradient
       * decoration — the scan stays visible above it.
       */}
      {/*
       * Bottom-weighted, as before: the darkness belongs to the edge that
       * slides under the next sheet, which is what makes the stack read as
       * depth. The last stop lands early and nearly opaque, so the tucked
       * border disappears into it instead of reading as a line. The top-left
       * label gets its own canopy plate instead.
       */}
      <LinearGradient
        colors={['rgba(3,10,7,0.12)', 'rgba(3,10,7,0.55)', 'rgba(3,10,7,0.98)']}
        locations={[0, 0.42, 0.78]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/*
       * The selection ring stops short of the tuck line. A border on the card
       * itself would keep showing through the next card's rounded top corners;
       * an overlay that ends where the next sheet starts cannot.
       */}
      {selected ? (
        <View
          pointerEvents="none"
          className="absolute top-0 right-0 left-0 rounded-t-panel border-t-2 border-r-2 border-l-2 border-brass"
          style={{ bottom: OVERLAP + 2 }}
        />
      ) : null}

      {selected ? (
        <View className="absolute top-3 right-3 rounded-full bg-parchment p-1">
          <Icon name="check" size={12} tone="primary" />
        </View>
      ) : null}

      <View className="absolute top-3 left-3 gap-0.5 rounded-chip bg-canopy/80 px-3 py-2">
        <Text variant="label" numberOfLines={1} className="text-parchment">
          {edition.name}
        </Text>
        <Text variant="caption" numberOfLines={1} className="text-parchment">
          {edition.riwaya} · {pages}
        </Text>
      </View>
    </Pressable>
  );
}
