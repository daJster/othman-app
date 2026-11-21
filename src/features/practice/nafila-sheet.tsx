import { useState } from 'react';
import { Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { cn } from '@/ui/cn';
import { Icon } from '@/ui/icon';
import { NativeSheetContent } from '@/ui/native-sheet-content';
import { SheetHeader } from '@/ui/sheet-header';
import { Text } from '@/ui/text';
import { ThemedBottomSheet } from '@/ui/themed-bottom-sheet';
import { Button } from '@/ui/button';
import { NAFILA_MAX } from '@/core/domain/practice/practice';

/**
 * The night prayer, as a one-step counter in a bottom sheet.
 *
 * A sheet rather than a dialog because this is a thumb-reachable, single-value
 * adjustment — the shape a phone expects for "set tonight's count". The control
 * is a small stepper rather than a keyboard number field: the range is 0–1, so
 * a keypad would be more ceremony than choice.
 *
 * The counter seeds from `value` by mounting only while the sheet is open, so
 * no effect writes state on presentation.
 */
export type NafilaSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: number;
  onSave: (value: number) => void;
};

export function NafilaSheet({
  open,
  onOpenChange,
  value,
  onSave,
}: NafilaSheetProps) {
  const { t } = useTranslation();
  const window = useWindowDimensions();
  const sheetWidth =
    Platform.OS === 'web' ? undefined : Math.max(0, window.width - 32);

  return (
    <ThemedBottomSheet
      isPresented={open}
      onDismiss={() => onOpenChange(false)}
      showDragIndicator={Platform.OS !== 'web'}
      snapPoints={Platform.OS === 'web' ? undefined : ['half']}
      testID="practice-nafila-sheet"
    >
      <NativeSheetContent>
        <View
          style={sheetWidth ? { width: sheetWidth } : undefined}
          className={cn(
            'gap-5 p-4 pb-6',
            Platform.OS === 'web' && 'mx-auto w-full max-w-md py-6',
          )}
        >
          <SheetHeader title={t('practice.nafila.title')} />

          <Text variant="caption" tone="muted">
            {t('practice.nafila.description', { max: NAFILA_MAX })}
          </Text>

          {open ? (
            <NafilaCounter
              key={value}
              value={value}
              onDone={(count) => {
                onSave(count);
                onOpenChange(false);
              }}
            />
          ) : null}
        </View>
      </NativeSheetContent>
    </ThemedBottomSheet>
  );
}

function NafilaCounter({
  value,
  onDone,
}: {
  value: number;
  onDone: (value: number) => void;
}) {
  const { t } = useTranslation();
  const [count, setCount] = useState(() =>
    Math.min(NAFILA_MAX, Math.max(0, value)),
  );

  return (
    <>
      <View className="flex-row items-center justify-center gap-6 py-2">
        <Stepper
          label={t('practice.nafila.decrease')}
          icon="minus"
          disabled={count <= 0}
          onPress={() => setCount((current) => Math.max(0, current - 1))}
        />

        <View className="items-center">
          {/* A real number field, not just a readout: the range is one step, so
              a keyboard answer is as valid as the +/- controls beside it. */}
          <Input
            testID="practice-nafila-value"
            value={String(count)}
            onChangeText={(text) => {
              const next = Number(text.replace(/\D/g, '').slice(0, 2));

              setCount(
                Number.isFinite(next)
                  ? Math.min(NAFILA_MAX, Math.max(0, next))
                  : 0,
              );
            }}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={2}
            accessibilityLabel={t('practice.nafila.valueLabel', {
              max: NAFILA_MAX,
            })}
            className="h-14 w-20 rounded-card border-transparent bg-transparent text-center text-3xl font-semibold tabular-nums shadow-none"
          />
        </View>

        <Stepper
          label={t('practice.nafila.increase')}
          icon="plus"
          disabled={count >= NAFILA_MAX}
          onPress={() =>
            setCount((current) => Math.min(NAFILA_MAX, current + 1))
          }
        />
      </View>

      <Button
        testID="practice-nafila-save"
        label={t('practice.done')}
        onPress={() => onDone(count)}
      />
    </>
  );
}

/** One round +/- control; 44pt so it is a thumb target, not a decoration. */
function Stepper({
  label,
  icon,
  disabled,
  onPress,
}: {
  label: string;
  icon: 'minus' | 'plus';
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        'h-11 w-11 items-center justify-center rounded-full border border-glass-edge bg-glass',
        disabled
          ? 'opacity-40'
          : 'hover:bg-foreground/5 active:bg-foreground/10',
      )}
    >
      <Icon name={icon} size={18} />
    </Pressable>
  );
}
