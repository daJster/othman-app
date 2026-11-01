import { ThemedBottomSheet } from '@/ui/themed-bottom-sheet';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, View } from 'react-native';
import type { SurahMetadata } from '@/core/types';
import { useDirection } from '@/i18n';
import { cn } from '@/ui/cn';
import { Input } from '@/ui/input';
import { NativeSheetContent } from '@/ui/native-sheet-content';
import { Pressable } from '@/ui/pressable';
import { SheetHeader } from '@/ui/sheet-header';
import { Text } from '@/ui/text';
import { formatReaderNumber } from '../format';
import { filterSurahs, sortSurahs } from '../surah-search';
import { RevelationMark } from './revelation-mark';

/**
 * Searchable surah picker.
 *
 * `FlatList`, not `@expo/ui` `List`: the native grouped list is a settings
 * surface that renders every row, and 114 searchable rows is exactly the case
 * a virtualized list exists for (this is also what D5 specifies).
 *
 * The sheet stays mounted and is opened by `isPresented` so the platform can
 * animate it; the query is cleared on dismiss so a reopened picker starts from
 * the full list instead of a stale filter.
 */
export type SurahPickerSheetProps = {
  isPresented: boolean;
  surahs: Readonly<Record<string, SurahMetadata>>;
  currentSurah: number;
  onDismiss: () => void;
  onSelect: (surah: number) => void;
};

export function SurahPickerSheet({
  isPresented,
  surahs,
  currentSurah,
  onDismiss,
  onSelect,
}: SurahPickerSheetProps) {
  const { t } = useTranslation();
  const { language, isRTL } = useDirection();
  const [query, setQuery] = useState('');

  // Clearing through the actions (rather than an effect on `isPresented`)
  // keeps this a reset on the way out: a closed sheet is unmounted by the
  // platform, so there is no frame where a stale filter could flash.
  const dismiss = useCallback(() => {
    setQuery('');
    onDismiss();
  }, [onDismiss]);

  const select = useCallback(
    (surah: number) => {
      setQuery('');
      onSelect(surah);
    },
    [onSelect],
  );

  const all = useMemo(() => sortSurahs(surahs), [surahs]);
  const rows = useMemo(() => filterSurahs(all, query), [all, query]);

  return (
    <ThemedBottomSheet
      isPresented={isPresented}
      onDismiss={dismiss}
      testID="surah-picker-sheet"
    >
      <NativeSheetContent>
        <View className="gap-3">
          <SheetHeader
            title={t('reader.surahPickerTitle')}
            onClose={dismiss}
            closeTestID="surah-picker-close"
          />

          <Input
            value={query}
            onChangeText={setQuery}
            placeholder={t('reader.searchSurahs')}
            accessibilityLabel={t('reader.searchSurahs')}
            autoCorrect={false}
            returnKeyType="search"
            testID="surah-search"
          />

          {rows.length === 0 ? (
            <Text variant="caption" tone="muted" testID="surah-empty">
              {t('reader.noSurahsFound')}
            </Text>
          ) : (
            <FlatList
              className="h-80"
              data={rows}
              keyExtractor={(item) => String(item.number)}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={16}
              renderItem={({ item }) => {
                const selected = item.number === currentSurah;

                return (
                  <Pressable
                    className={
                      selected
                        ? 'flex-row items-center gap-3 rounded-lg bg-muted px-3 py-2'
                        : 'flex-row items-center gap-3 rounded-lg px-3 py-2'
                    }
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${formatReaderNumber(
                      item.number,
                      language,
                    )} ${language === 'ar' ? item.name : item.nameEnglish}`}
                    onPress={() => select(item.number)}
                    testID={`surah-row:${item.number}`}
                  >
                    <Text
                      variant="caption"
                      tone="muted"
                      className="w-8 text-end tabular-nums"
                    >
                      {formatReaderNumber(item.number, language)}
                    </Text>
                    <View className="min-w-0 flex-1">
                      <Text variant="label" family="arabic" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text variant="caption" tone="muted" numberOfLines={1}>
                        {item.nameEnglish}
                      </Text>
                    </View>
                    <View
                      className={cn(
                        'flex-row items-center gap-2',
                        isRTL && 'flex-row-reverse',
                      )}
                    >
                      <RevelationMark location={item.location} />
                      <Text variant="caption" tone="muted">
                        {t('reader.ayahCount', {
                          count: formatReaderNumber(item.ayahCount, language),
                        })}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </NativeSheetContent>
    </ThemedBottomSheet>
  );
}
