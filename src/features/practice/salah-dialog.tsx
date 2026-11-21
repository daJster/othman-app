import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  SALAH_NAMES,
  SALAH_TARGET,
  type SalahName,
} from '@/core/domain/practice/practice';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { cn } from '@/ui/cn';

/**
 * The five prayers, as hold-to-toggle bars.
 *
 * A 1-second hold: reaching 100% wiggles the row,
 * turns it green for a beat and swaps the label for a short praise. Then the
 * bar **resets** and the prayer's checkbox state flips — the fill is the
 * gesture, the check is the state. A filled prayer can be cleared by a tap or
 * by holding it again, which is the toggle.
 *
 * The dialog applies on Done, so a half-finished edit never lands. The
 * checklist seeds from `value` by mounting inside the dialog content, which
 * Radix unmounts on close.
 */
export type SalahDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prayers already recorded (0–5). */
  value: number;
  onSave: (count: number) => void;
};

/** Shorter than the duaa control: five prayers in a row should not cost 15s. */
const HOLD_MS = 1000;
/** How long the green beat and its praise stay before the state settles. */
const CELEBRATE_MS = 900;

export function SalahDialog({
  open,
  onOpenChange,
  value,
  onSave,
}: SalahDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('practice.salah.title')}</DialogTitle>
          <DialogDescription>
            {t('practice.salah.description', { count: SALAH_TARGET })}
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <SalahChecklist
            key={value}
            value={value}
            onDone={(count) => {
              onSave(count);
              onOpenChange(false);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SalahChecklist({
  value,
  onDone,
}: {
  value: number;
  onDone: (count: number) => void;
}) {
  const { t } = useTranslation();
  const phrases = [
    t('practice.duaa.phrases.mashaallah'),
    t('practice.duaa.phrases.alhamdulillah'),
    t('practice.duaa.phrases.subhanallah'),
  ];
  const [checked, setChecked] = useState<SalahName[]>(() =>
    SALAH_NAMES.slice(0, value),
  );

  const toggle = (name: SalahName) => {
    setChecked((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  };

  return (
    <>
      <View className="gap-1.5 py-2">
        {SALAH_NAMES.map((name, index) => (
          <SalahHoldRow
            key={name}
            name={name}
            checked={checked.includes(name)}
            phrase={phrases[index % phrases.length]}
            onToggle={() => toggle(name)}
          />
        ))}
      </View>

      <DialogFooter>
        <Button
          testID="practice-salah-save"
          label={t('practice.done')}
          onPress={() => onDone(checked.length)}
        />
      </DialogFooter>
    </>
  );
}

/** One prayer: a one-second hold that toggles the checkbox it represents. */
function SalahHoldRow({
  name,
  checked,
  phrase,
  onToggle,
}: {
  name: SalahName;
  checked: boolean;
  /** The praise shown while the row celebrates. */
  phrase: string;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const [progress] = useState(() => new Animated.Value(0));
  const [green] = useState(() => new Animated.Value(0));
  const [wiggle] = useState(() => new Animated.Value(0));
  const [celebrating, setCelebrating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
      progress.stopAnimation();
      green.stopAnimation();
      wiggle.stopAnimation();
    },
    [green, progress, wiggle],
  );

  const label = t(`practice.salah.${name}`);

  const celebrate = () => {
    setCelebrating(true);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(wiggle, {
          toValue: 1,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(wiggle, {
          toValue: -1,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(wiggle, {
          toValue: 0.7,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(wiggle, {
          toValue: -0.5,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(wiggle, {
          toValue: 0,
          duration: 90,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(green, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.delay(360),
        Animated.timing(green, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const next = setTimeout(() => {
      // The fill is only the gesture: it clears while the checkbox flips, so a
      // checked row is a check, not a permanently full bar.
      progress.setValue(0);
      green.setValue(0);
      wiggle.setValue(0);
      setCelebrating(false);
      timer.current = null;
      onToggle();
    }, CELEBRATE_MS);

    timer.current = next;
  };

  const start = () => {
    if (celebrating) return;

    Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) celebrate();
    });
  };

  const stop = () => {
    if (celebrating) return;
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  };

  const fill = {
    width: progress.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    }),
  };
  const greenStyle = { opacity: green };
  const wiggleStyle = {
    transform: [
      {
        rotate: wiggle.interpolate({
          inputRange: [-1, 1],
          outputRange: ['-2deg', '2deg'],
        }),
      },
    ],
  };

  return (
    <Animated.View style={wiggleStyle}>
      <Pressable
        testID={`practice-salah-${name}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        aria-checked={checked}
        accessibilityLabel={celebrating ? phrase : label}
        accessibilityHint={t('practice.salah.holdHint')}
        onPressIn={start}
        onPressOut={stop}
        // A filled row is a toggle: tap it to clear without waiting again.
        onPress={() => {
          if (checked && !celebrating) {
            progress.setValue(0);
            onToggle();
          }
        }}
        style={{ direction: 'ltr' }}
        className={cn(
          'relative h-12 w-full overflow-hidden rounded-chip border',
          checked ? 'border-success' : 'border-glass-edge',
        )}
      >
        <Animated.View
          pointerEvents="none"
          style={fill}
          className="absolute inset-y-0 left-0 bg-brass/70"
        />
        <Animated.View
          pointerEvents="none"
          style={greenStyle}
          className="absolute inset-0 rounded-chip bg-success"
        />
        <View className="h-full flex-row items-center justify-center gap-2">
          {checked ? <Icon name="check" size={12} tone="success" /> : null}
          <Text variant="label" className="text-sm">
            {celebrating ? phrase : label}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
