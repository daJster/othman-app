import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View, useWindowDimensions } from 'react-native';
import { LANGUAGES } from '@/i18n';
import { Button, ButtonText } from '@/ui/button';
import { cn } from '@/ui/cn';
import { Icon } from '@/ui/icon';
import { NativeSheetContent } from '@/ui/native-sheet-content';
import { ThemeSelector } from '@/ui/panel';
import { SheetHeader } from '@/ui/sheet-header';
import { ThemedBottomSheet } from '@/ui/themed-bottom-sheet';
import { useLanguageChoice } from './use-language-choice';

/**
 * The two preference choosers.
 *
 * A sheet, not an inline control: both choices are set-once, the page should
 * stay a summary, and the native sheet already owns dismissal, the backdrop,
 * the drag indicator and the safe area. The shell is shared so the two sheets
 * cannot drift in width, padding or header style.
 *
 * `ThemeSelector` keeps its hint here — inside the chooser the "System follows
 * your device" sentence is about the choice being made, not permanent page
 * copy. Language uses full-width rows with a check rather than a dropdown:
 * two options are easier to read than a menu that hides them.
 */
type PreferenceSheetProps = {
  title: string;
  testID: string;
  onClose: () => void;
  children: ReactNode;
};

function PreferenceSheet({
  title,
  testID,
  onClose,
  children,
}: PreferenceSheetProps) {
  const window = useWindowDimensions();
  const native = Platform.OS !== 'web';

  return (
    <ThemedBottomSheet
      isPresented
      onDismiss={onClose}
      showDragIndicator={native}
      testID={testID}
    >
      <NativeSheetContent>
        {/*
         * A native sheet host gives its RN subtree no width: without an
         * explicit measure the content lays out at its intrinsic width and runs
         * off the edge. Web's dialog constrains itself.
         */}
        <View
          style={native ? { width: Math.max(0, window.width - 32) } : undefined}
          className={cn(
            'gap-4 p-4 pb-6',
            !native && 'mx-auto w-full max-w-md py-6',
          )}
        >
          <SheetHeader title={title} />
          {children}
        </View>
      </NativeSheetContent>
    </ThemedBottomSheet>
  );
}

export type AppearanceSheetProps = {
  onClose: () => void;
};

export function AppearanceSheet({ onClose }: AppearanceSheetProps) {
  const { t } = useTranslation();

  return (
    <PreferenceSheet
      title={t('theme.title')}
      testID="appearance-sheet"
      onClose={onClose}
    >
      <ThemeSelector />
    </PreferenceSheet>
  );
}

export type LanguageSheetProps = {
  onClose: () => void;
};

export function LanguageSheet({ onClose }: LanguageSheetProps) {
  const { t } = useTranslation();
  const { language, select } = useLanguageChoice();

  return (
    <PreferenceSheet
      title={t('language.title')}
      testID="language-sheet"
      onClose={onClose}
    >
      <View className="gap-2">
        {LANGUAGES.map((option) => {
          const selected = option.code === language;

          return (
            <Button
              key={option.code}
              testID={`language-option:${option.code}`}
              variant={selected ? 'secondary' : 'outline'}
              size="lg"
              accessibilityState={{ selected }}
              onPress={() => {
                void select(option.code);
                onClose();
              }}
              className={cn(
                'w-full justify-between px-4',
                // The secondary fill alone is nearly invisible on the sheet's
                // dark ground; the hairline is what makes the chosen language
                // read at a glance, the same pairing the theme segments use.
                selected && 'border border-glass-edge',
              )}
            >
              <ButtonText
                variant={selected ? 'secondary' : 'outline'}
                size="lg"
              >
                {t(option.labelKey)}
              </ButtonText>
              {selected ? <Icon name="check" size={18} tone="primary" /> : null}
            </Button>
          );
        })}
      </View>
    </PreferenceSheet>
  );
}
