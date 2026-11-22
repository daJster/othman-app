import {
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { formatDateKey, parseDateKey } from '@/core/domain/meetings/date-key';
import type { DateKey } from '@/core/types';
import { useDirection } from '@/i18n';
import { useThemeMode } from '@/providers/theme-provider';
import { Button } from '@/ui/button';
import { cn } from '@/ui/cn';
import { NativeSheetContent } from '@/ui/native-sheet-content';
import { SheetHeader } from '@/ui/sheet-header';
import { Text } from '@/ui/text';
import { ThemedBottomSheet } from '@/ui/themed-bottom-sheet';
import {
  formatClockTime,
  formatDayNumber,
  formatMonthYear,
  formatWeekdayShort,
} from './calendar-format';

/**
 * Date and time selection, as something you scrub rather than a table you read.
 *
 * The first version put a 42-cell month grid and a 24-number hour grid behind
 * separate sheets. Both were precise and both felt like data entry: nothing
 * moved, nothing told you "tomorrow evening" in the way a person thinks it, and
 * each sheet was a second surface stacked on the form dialog.
 *
 * These two rails share one gesture: the value sits under a fixed marker and you
 * slide the day or the hour beneath it. The form is a dialog, and a date or an
 * hour is a focused sub-decision that wants the thumb zone, so each picker
 * opens its own bottom sheet; the snap, the centre marker and the selection
 * tick do the confirming, so the controls read without a label. The date rail
 * carries the week rhythm; the time ruler is drawn over the day's light,
 * because an hour of the day is not an abstract number.
 */
const DAY_WIDTH = 56;
const DAY_GAP = 8;
const DAY_STRIDE = DAY_WIDTH + DAY_GAP;

const SLOT_WIDTH = 22;
const SLOTS = 96; // every quarter hour of the day

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

function addDays(date: Date, days: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    12,
  );
}

function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let cursor = start;

  while (cursor.getTime() <= end.getTime()) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

function tick(): void {
  if (Platform.OS !== 'web') {
    void Haptics.selectionAsync();
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export type DateRailProps = {
  value: DateKey;
  /** Width of the sheet's content column, so the selected day can centre. */
  width: number;
  onChange: (date: DateKey) => void;
  onDone: () => void;
};

export function DateRail({ value, width, onChange, onDone }: DateRailProps) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const rail = useRef<ComponentRef<typeof ScrollView>>(null);
  const positioned = useRef(false);
  const lastKey = useRef(value);
  const programmaticUntil = useRef(0);

  const selected = parseDateKey(value);
  const today = startOfDay(new Date());
  /*
   * The list is anchored to today, not to the selection.
   *
   * Building the window from `selected` reindexes every day whenever the
   * value changes, so the item under the marker jumped a full slot after each
   * swipe. A fixed window keeps every index stable while you scrub; it only
   * grows when the value sits outside the ordinary range (editing an old or
   * distant session).
   */
  const from = Math.min(
    addDays(today, -7).getTime(),
    addDays(selected, -1).getTime(),
  );
  const to = Math.max(
    addDays(today, 120).getTime(),
    addDays(selected, 1).getTime(),
  );
  const days = eachDay(startOfDay(new Date(from)), startOfDay(new Date(to)));
  const selectedIndex = Math.max(
    0,
    days.findIndex((day) => formatDateKey(day) === value),
  );
  const padding = Math.max(0, (width - DAY_WIDTH) / 2);

  const position = () => {
    if (positioned.current) return;
    positioned.current = true;
    rail.current?.scrollTo({ x: selectedIndex * DAY_STRIDE, animated: false });
  };

  useEffect(() => {
    const id = setTimeout(position, 0);

    return () => clearTimeout(id);
    // The selected date is the starting position, not a value to chase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (index: number) => {
    const day = days[index];

    if (!day) return;

    const key = formatDateKey(day);

    if (lastKey.current === key) return;

    lastKey.current = key;
    tick();
    onChange(key);
  };

  /*
   * The scroll position is the source of truth, never a value we scroll to.
   *
   * Snapping already lands on a whole stride, so reading the offset keeps the
   * highlight and the day under the marker in lockstep. Re-centring here used
   * to fight the native momentum: the value jumped back one day while the rail
   * kept gliding forward.
   */
  const read = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Date.now() < programmaticUntil.current) return;

    const index = Math.min(
      days.length - 1,
      Math.max(0, Math.round(event.nativeEvent.contentOffset.x / DAY_STRIDE)),
    );

    choose(index);
  };

  /*
   * Tapping a day or Today moves the rail for us. The scroll events that
   * animation produces would otherwise step through every day in between and
   * briefly report the wrong date, so reads pause until it lands.
   */
  const goTo = (index: number, key: DateKey) => {
    lastKey.current = key;
    programmaticUntil.current = Date.now() + 400;
    tick();
    onChange(key);
    rail.current?.scrollTo({ x: index * DAY_STRIDE, animated: true });
  };

  const goToday = () => {
    const index = days.findIndex(
      (day) => formatDateKey(day) === formatDateKey(today),
    );

    if (index < 0) return;

    goTo(index, formatDateKey(today));
  };

  return (
    <View className="gap-3" testID="meeting-date-rail">
      <View className="flex-row items-baseline justify-between gap-2">
        <Text variant="label">{formatMonthYear(selected, language)}</Text>
        <Button
          variant="link"
          size="sm"
          label={t('meeting.form.today')}
          onPress={goToday}
        />
      </View>

      <View className="-mx-1">
        <ScrollView
          ref={rail}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={DAY_STRIDE}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onLayout={position}
          onScroll={read}
          onMomentumScrollEnd={read}
          contentContainerStyle={{ paddingHorizontal: padding }}
        >
          {days.map((day, index) => {
            const key = formatDateKey(day);
            const isSelected = index === selectedIndex;

            return (
              <View
                key={key}
                style={{ width: DAY_WIDTH, marginRight: DAY_GAP }}
                className="items-center"
              >
                <Text variant="caption" tone="muted" align="center">
                  {formatWeekdayShort(day, language)}
                </Text>
                <Button
                  variant={isSelected ? 'secondary' : 'ghost'}
                  size="sm"
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${formatWeekdayShort(day, language)} ${formatDayNumber(day.getDate(), language)}`}
                  onPress={() => goTo(index, key)}
                  className={cn(
                    'mt-1 h-14 w-14 rounded-xl border p-0',
                    isSelected ? 'border-brass/60' : 'border-transparent',
                  )}
                >
                  <Text
                    variant="subtitle"
                    tone={isSelected ? 'default' : 'muted'}
                  >
                    {formatDayNumber(day.getDate(), language)}
                  </Text>
                </Button>
              </View>
            );
          })}
        </ScrollView>
      </View>

      <Text variant="caption" tone="muted" align="center">
        {t('meeting.form.dateSwipeHint')}
      </Text>

      <Button label={t('action.done')} onPress={onDone} />
    </View>
  );
}

export type TimeRulerProps = {
  value: string;
  width: number;
  onChange: (time: string) => void;
  onDone: () => void;
};

export function TimeRuler({ value, width, onChange, onDone }: TimeRulerProps) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const { isDark } = useThemeMode();
  const rail = useRef<ComponentRef<typeof ScrollView>>(null);
  const positioned = useRef(false);
  const lastIndex = useRef(-1);
  const [initial] = useState(() => {
    const [hours, minutes] = value.split(':').map(Number);

    return Math.min(
      SLOTS - 1,
      Math.max(
        0,
        Math.round(
          ((Number.isFinite(hours) ? hours : 0) * 60 +
            (Number.isFinite(minutes) ? minutes : 0)) /
            15,
        ),
      ),
    );
  });
  const [index, setIndex] = useState(initial);
  const padding = Math.max(0, (width - SLOT_WIDTH) / 2);
  const hour = Math.floor(index / 4);
  const minute = (index % 4) * 15;
  const time = `${pad(hour)}:${pad(minute)}`;

  const position = () => {
    if (positioned.current) return;
    positioned.current = true;
    rail.current?.scrollTo({ x: initial * SLOT_WIDTH, animated: false });
  };

  useEffect(() => {
    const id = setTimeout(position, 0);

    return () => clearTimeout(id);
    // The starting value positions the ruler once; scrolling owns it after.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const readIndex = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.min(
      SLOTS - 1,
      Math.max(0, Math.round(event.nativeEvent.contentOffset.x / SLOT_WIDTH)),
    );

    if (next === lastIndex.current) return;

    lastIndex.current = next;
    setIndex(next);
    tick();

    const nextHour = Math.floor(next / 4);
    const nextMinute = (next % 4) * 15;
    onChange(`${pad(nextHour)}:${pad(nextMinute)}`);
  };

  return (
    <View className="gap-2" testID="meeting-time-ruler">
      <View className="flex-row items-baseline justify-between gap-2">
        <Text variant="title">{formatClockTime(time, language)}</Text>
        <Text variant="caption" tone="muted">
          {t('meeting.form.timeSwipeHint')}
        </Text>
      </View>

      <View
        className="relative overflow-hidden rounded-lg border border-glass-edge"
        style={{ height: 64 }}
      >
        {/*
         * Night → dawn → afternoon → dusk → night. Low contrast, so it reads as
         * the day behind the scale rather than as a coloured control.
         */}
        <LinearGradient
          pointerEvents="none"
          colors={
            isDark
              ? ['#0b1018', '#18251f', '#2a2718', '#2a1b15', '#0b1018']
              : ['#f4efe5', '#f8f2e2', '#f5e8d3', '#f1e2d2', '#f4efe5']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />

        <ScrollView
          ref={rail}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={SLOT_WIDTH}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onLayout={position}
          onScroll={readIndex}
          contentContainerStyle={{ paddingHorizontal: padding }}
        >
          {Array.from({ length: SLOTS }, (_, slot) => {
            const slotMinute = (slot % 4) * 15;
            const isHour = slotMinute === 0;
            const isSelected = slot === index;

            return (
              <View
                key={slot}
                style={{ width: SLOT_WIDTH }}
                className="items-center justify-center"
              >
                <View
                  className={cn(
                    'w-px',
                    isSelected
                      ? 'h-6 bg-brass'
                      : isHour
                        ? 'h-4 bg-foreground/70'
                        : 'h-2 bg-muted-foreground/40',
                  )}
                />
                {isHour ? (
                  <Text
                    variant="caption"
                    tone={isSelected ? 'default' : 'muted'}
                    className={cn(
                      'mt-1 text-2xs',
                      isSelected && 'text-brass-ink',
                    )}
                  >
                    {pad(Math.floor(slot / 4))}
                  </Text>
                ) : (
                  <View className="h-4" />
                )}
              </View>
            );
          })}
        </ScrollView>

        <View
          pointerEvents="none"
          className="absolute top-0 bottom-0 w-px bg-brass/80"
          style={{ left: width / 2 }}
        />
      </View>

      <Button label={t('action.done')} onPress={onDone} />
    </View>
  );
}

/**
 * The bottom drawer that owns a picker.
 *
 * The form is a dialog; a date or an hour is a focused sub-decision that wants
 * the thumb zone and the platform's own dismissal, so each opens a sheet rather
 * than growing the dialog. The sheet passes its measured content width down, so
 * the rail can centre a value instead of guessing a padding.
 */
type PickerSheetProps = {
  title: string;
  testID: string;
  onClose: () => void;
  children: (width: number) => ReactNode;
};

function PickerSheet({ title, testID, onClose, children }: PickerSheetProps) {
  const window = useWindowDimensions();
  const native = Platform.OS !== 'web';
  const sheetWidth = native
    ? Math.max(0, window.width - 32)
    : Math.min(Math.max(0, window.width - 32), 448);
  const contentWidth = Math.max(0, sheetWidth - 32);

  return (
    <ThemedBottomSheet
      isPresented
      onDismiss={onClose}
      showDragIndicator={native}
      testID={testID}
    >
      <NativeSheetContent>
        <View
          style={native ? { width: sheetWidth } : undefined}
          className={cn(
            'gap-4 p-4 pb-6',
            !native && 'mx-auto w-full max-w-md py-6',
          )}
        >
          <SheetHeader title={title} />
          {children(contentWidth)}
        </View>
      </NativeSheetContent>
    </ThemedBottomSheet>
  );
}

export type DateSheetProps = {
  open: boolean;
  value: DateKey;
  onClose: () => void;
  onChange: (date: DateKey) => void;
};

export function DateSheet({ open, value, onClose, onChange }: DateSheetProps) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <PickerSheet
      title={t('meeting.form.pickDate')}
      testID="meeting-date-sheet"
      onClose={onClose}
    >
      {(width) => (
        <DateRail
          value={value}
          width={width}
          onChange={onChange}
          onDone={onClose}
        />
      )}
    </PickerSheet>
  );
}

export type TimeSheetProps = {
  open: boolean;
  value: string;
  onClose: () => void;
  onChange: (time: string) => void;
};

export function TimeSheet({ open, value, onClose, onChange }: TimeSheetProps) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <PickerSheet
      title={t('meeting.form.pickTime')}
      testID="meeting-time-sheet"
      onClose={onClose}
    >
      {(width) => (
        <TimeRuler
          value={value}
          width={width}
          onChange={onChange}
          onDone={onClose}
        />
      )}
    </PickerSheet>
  );
}
