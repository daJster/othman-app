import { BottomSheet, Column, Host, Picker, Slider, Switch } from '@expo/ui';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { Shaykh } from '@/core/config';
import { useDirection } from '@/i18n';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import type { SelectedAyah } from '../ayah-content';
import { formatAudioTime, formatReaderNumber } from '../format';
import type { AyahAudioController } from '../use-ayah-audio';

/**
 * Selected-ayah audio panel.
 *
 * The player itself lives in `ReaderScreen`, not here: closing the sheet must
 * not stop the recitation, and leaving the reader is what releases it. This
 * component only renders controls, so every state it shows comes from the one
 * player rather than a second clock.
 *
 * Seek, reciter and the two switches are `@expo/ui` controls inside one `Host`:
 * a SwiftUI/Compose slider cannot be mounted directly in an RN view. Play,
 * pause and the ayah steps stay RN buttons because they are app-styled and work
 * identically on all three targets.
 *
 * Auto-read and wrap are separate: auto-read decides *whether* completion
 * advances, wrap decides *where* it goes at a surah boundary. With wrap off the
 * final ayah simply stops, which is the spec's default.
 */
export type AudioSheetProps = {
  isPresented: boolean;
  selected: SelectedAyah | null;
  surahName: string | null;
  reciters: readonly Shaykh[];
  reciterId: string;
  autoRead: boolean;
  wrap: boolean;
  audio: AyahAudioController;
  canStepPrevious: boolean;
  canStepNext: boolean;
  onDismiss: () => void;
  onReciterChange: (identifier: string) => void;
  onAutoReadChange: (enabled: boolean) => void;
  onWrapChange: (enabled: boolean) => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function AudioSheet({
  isPresented,
  selected,
  surahName,
  reciters,
  reciterId,
  autoRead,
  wrap,
  audio,
  canStepPrevious,
  canStepNext,
  onDismiss,
  onReciterChange,
  onAutoReadChange,
  onWrapChange,
  onPrevious,
  onNext,
}: AudioSheetProps) {
  const { t } = useTranslation();
  const { language, isRTL } = useDirection();
  const previousIcon = isRTL ? 'chevron-right' : 'chevron-left';
  const nextIcon = isRTL ? 'chevron-left' : 'chevron-right';
  const position = selected
    ? t('reader.selectedAyah', {
        ayah: formatReaderNumber(selected.ayah, language),
        surah: surahName ?? formatReaderNumber(selected.surah, language),
      })
    : null;

  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      testID="audio-sheet"
    >
      <View className="gap-3">
        <View className="flex-row items-center justify-between gap-2">
          <Text variant="subtitle">{t('reader.panelAudioTitle')}</Text>
          <Button
            variant="ghost"
            size="sm"
            label={t('action.close')}
            onPress={onDismiss}
            testID="audio-close"
          />
        </View>

        {selected ? (
          <>
            <Text variant="caption" tone="muted" testID="audio-identity">
              {position}
            </Text>

            <View className="flex-row items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                disabled={!canStepPrevious}
                accessibilityLabel={t('reader.audioPreviousAyah')}
                onPress={onPrevious}
                testID="audio-prev"
              >
                <Icon name={previousIcon} size={22} />
              </Button>

              <Button
                variant="outline"
                size="icon"
                disabled={!audio.isLoaded}
                accessibilityLabel={
                  audio.playing ? t('reader.audioPause') : t('reader.audioPlay')
                }
                onPress={audio.toggle}
                testID="audio-toggle"
              >
                <Icon
                  name={audio.playing ? 'pause' : 'play'}
                  size={24}
                  tone="primary"
                />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                disabled={!canStepNext}
                accessibilityLabel={t('reader.audioNextAyah')}
                onPress={onNext}
                testID="audio-next"
              >
                <Icon name={nextIcon} size={22} />
              </Button>
            </View>

            <View className="gap-1">
              <Host
                matchContents={{ vertical: true }}
                style={{ alignSelf: 'stretch' }}
              >
                <Column spacing={12}>
                  <Slider
                    value={Math.min(
                      audio.currentTime,
                      Math.max(audio.duration, 1),
                    )}
                    min={0}
                    max={Math.max(audio.duration, 1)}
                    step={1}
                    disabled={!audio.isLoaded}
                    onValueChange={audio.seekTo}
                    testID="audio-seek"
                  />
                </Column>
              </Host>

              <View className="flex-row justify-between">
                <Text variant="caption" tone="muted" className="tabular-nums">
                  {formatAudioTime(audio.currentTime)}
                </Text>
                <Text variant="caption" tone="muted" className="tabular-nums">
                  {formatAudioTime(audio.duration)}
                </Text>
              </View>
            </View>

            {audio.buffering && !audio.error ? (
              <Text variant="caption" tone="muted" testID="audio-buffering">
                {t('reader.audioBuffering')}
              </Text>
            ) : null}

            {audio.error ? (
              <View className="gap-2" testID="audio-error">
                <Text variant="caption" tone="muted">
                  {t('reader.audioError')}
                </Text>
                <Button
                  variant="outline"
                  size="sm"
                  label={t('action.retry')}
                  onPress={audio.retry}
                  testID="audio-retry"
                />
              </View>
            ) : null}

            <View className="gap-2">
              <Text variant="overline" tone="muted">
                {t('reader.audioReciter')}
              </Text>
              <Host
                matchContents={{ vertical: true }}
                style={{ alignSelf: 'stretch' }}
              >
                <Column spacing={12}>
                  <Picker
                    selectedValue={reciterId}
                    onValueChange={onReciterChange}
                    testID="audio-reciter"
                  >
                    {reciters.map((reciter) => (
                      <Picker.Item
                        key={reciter.identifier}
                        label={
                          language === 'ar' ? reciter.name : reciter.englishName
                        }
                        value={reciter.identifier}
                      />
                    ))}
                  </Picker>

                  <Switch
                    value={autoRead}
                    onValueChange={onAutoReadChange}
                    label={t('reader.audioAutoRead')}
                    testID="audio-auto-read"
                  />

                  <Switch
                    value={wrap}
                    onValueChange={onWrapChange}
                    label={t('reader.audioWrap')}
                    testID="audio-wrap"
                  />
                </Column>
              </Host>
            </View>

            <Text variant="caption" tone="muted">
              {t('reader.audioBackgroundNote')}
            </Text>
          </>
        ) : (
          <Text variant="body" tone="muted" testID="audio-empty">
            {t('reader.panelNeedsSelection')}
          </Text>
        )}
      </View>
    </BottomSheet>
  );
}
