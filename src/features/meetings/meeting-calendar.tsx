import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { formatDateKey } from '@/core/domain/meetings/date-key';
import {
  CALENDAR_WEEK_LENGTH,
  buildCalendarMonth,
  canShiftCalendarMonth,
  shiftCalendarMonth,
  type CalendarSystem,
} from '@/core/utils/calendar';
import { tryGregorianDateToHijri } from '@/core/utils/hijri';
import { useDirection } from '@/i18n';
import { Button } from '@/ui/button';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { GlassPanel } from '@/ui/glass';
import { Icon } from '@/ui/icon';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Text } from '@/ui/text';
import {
  formatDayNumber,
  formatLongDate,
  formatMonthLabel,
  weekdayLabels,
} from './calendar-format';

/**
 * Meetings calendar.
 *
 * One grid, two numbering systems. The canonical value is always the Gregorian
 * `Date`: switching to Hijri changes only the printed day numbers, so the
 * selected day (and therefore the fetched meetings) never moves.
 *
 * The grid is a plain `flex-row flex-wrap` of 44 pt cells rather than a
 * virtualised list. Six rows are cheap to render, and a `FlatList` inside a
 * `FlatList` header is a scroll-nesting bug waiting to happen.
 *
 * The grid is `flex-row flex-wrap`, so the week starts on the left in both
 * languages: the layout does not mirror. The month arrows are physical too —
 * previous on the left, next on the right — while the weekday and day labels
 * inside the cells follow the text direction.
 *
 * `markedDays` turns the grid into a map: a dot on every day that holds a
 * session, and the count in that day's accessible name. Before it, a day with
 * a meeting and a day without one were indistinguishable until you tapped each.
 */
export type MeetingCalendarProps = {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  /** Date key → number of sessions that day. */
  markedDays?: ReadonlyMap<string, number>;
};

const CELL_WIDTH = 'w-[14.2857%]';

/** Selection is a light, physical confirmation — the same weight as the tap. */
function tick() {
  if (Platform.OS === 'web') return;
  void Haptics.selectionAsync().catch(() => {});
}

/** A month change is a bigger move than a day, so it gets a firmer tap. */
function nudge() {
  if (Platform.OS === 'web') return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function MeetingCalendar({
  selectedDate,
  onSelect,
  markedDays,
}: MeetingCalendarProps) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const [system, setSystem] = useState<CalendarSystem>('gregorian');
  const [anchor, setAnchor] = useState<Date>(() => selectedDate);

  const month = useMemo(
    () => buildCalendarMonth(anchor, system),
    [anchor, system],
  );
  const selectedKey = formatDateKey(selectedDate);
  const weekdays = weekdayLabels(language);

  const canGoPrevious = canShiftCalendarMonth(anchor, system, -1);
  const canGoNext = canShiftCalendarMonth(anchor, system, 1);

  function changeSystem(next: CalendarSystem) {
    // A Gregorian month outside the Hijri table (e.g. 1900) has no grid to
    // show. Return the view to today rather than rendering an error.
    if (next === 'hijri' && !tryGregorianDateToHijri(anchor)) {
      setAnchor(new Date());
    }
    setSystem(next);
    nudge();
  }

  function goToToday() {
    const today = new Date();
    setAnchor(today);
    onSelect(today);
    tick();
  }

  function selectDay(date: Date) {
    // Tapping an outside day also moves the visible month — the expected
    // behaviour of every platform calendar.
    setAnchor(date);
    onSelect(date);
    tick();
  }

  return (
    <GlassPanel
      radius="card"
      weight="panel"
      className="w-full max-w-lg gap-3 self-center p-3"
    >
      <View className="flex-row items-center justify-between gap-2">
        <MonthButton
          direction="left"
          label={t('meeting.calendar.previous')}
          disabled={!canGoPrevious}
          onPress={() => {
            setAnchor(shiftCalendarMonth(anchor, system, -1));
            nudge();
          }}
        />
        {/*
         * A subtitle, not a heading: the screen's title is the only H1, and
         * `accessibilityRole="header"` here promoted the month to a second one.
         */}
        <Text
          testID="calendar-month-label"
          variant="subtitle"
          className="flex-1 text-center"
        >
          {formatMonthLabel(month, language)}
        </Text>
        <MonthButton
          direction="right"
          label={t('meeting.calendar.next')}
          disabled={!canGoNext}
          onPress={() => {
            setAnchor(shiftCalendarMonth(anchor, system, 1));
            nudge();
          }}
        />
      </View>

      <View className="flex-row">
        {weekdays.slice(0, CALENDAR_WEEK_LENGTH).map((label, index) => (
          <View key={`${label}-${index}`} className={cn(CELL_WIDTH, 'py-1')}>
            <Text variant="caption" tone="muted" className="text-center">
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {month.days.map((day) => {
          const selected = day.dateKey === selectedKey;
          const sessions = markedDays?.get(day.dateKey) ?? 0;
          const dateLabel = formatLongDate(day.date, language);
          const separator = language === 'ar' ? '، ' : ', ';

          return (
            <View key={day.dateKey} className={cn(CELL_WIDTH, 'p-0.5')}>
              <Pressable
                testID={`calendar-day:${day.dateKey}`}
                accessibilityRole="button"
                accessibilityLabel={
                  sessions > 0
                    ? `${dateLabel}${separator}${t('meeting.found', {
                        count: sessions,
                      })}`
                    : dateLabel
                }
                accessibilityState={{ selected }}
                onPress={() => selectDay(day.date)}
                className={cn(
                  'relative h-control items-center justify-center rounded-chip border active:opacity-70',
                  FOCUS_RING,
                  selected
                    ? 'border-primary bg-primary'
                    : day.isToday
                      ? 'border-primary/40 bg-accent'
                      : 'border-transparent bg-transparent',
                )}
              >
                <Text
                  variant="label"
                  className={cn(
                    selected
                      ? 'text-primary-foreground'
                      : day.inMonth
                        ? 'text-foreground'
                        : 'text-muted-foreground',
                  )}
                >
                  {formatDayNumber(day.day, language)}
                </Text>

                {/*
                 * A session mark, not a decoration: it says the day has
                 * something to open. Primary rather than brass because brass
                 * clears 3:1 on the card only at text sizes; a 4 px dot needs
                 * the solid accent. On the selected cell it inverts with the
                 * numerals.
                 */}
                {sessions > 0 ? (
                  <View
                    testID={`calendar-mark:${day.dateKey}`}
                    className={cn(
                      'absolute bottom-1 h-1 w-1 rounded-full',
                      selected ? 'bg-primary-foreground' : 'bg-primary',
                    )}
                  />
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>

      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <ToggleGroup
          type="single"
          value={system}
          onValueChange={(next) => {
            if (next === 'gregorian' || next === 'hijri') changeSystem(next);
          }}
          accessibilityLabel={t('meeting.calendar.system')}
          variant="outline"
          size="sm"
          className="h-11"
        >
          <ToggleGroupItem value="gregorian" isFirst className="h-11 px-3">
            <Text
              variant="label"
              tone={system === 'gregorian' ? 'default' : 'muted'}
            >
              {t('meeting.calendar.gregorian')}
            </Text>
          </ToggleGroupItem>
          <ToggleGroupItem value="hijri" isLast className="h-11 px-3">
            <Text
              variant="label"
              tone={system === 'hijri' ? 'default' : 'muted'}
            >
              {t('meeting.calendar.hijri')}
            </Text>
          </ToggleGroupItem>
        </ToggleGroup>
        <Button
          variant="ghost"
          label={t('meeting.calendar.today')}
          onPress={goToToday}
        />
      </View>
    </GlassPanel>
  );
}

function MonthButton({
  direction,
  label,
  disabled,
  onPress,
}: {
  direction: 'left' | 'right';
  label: string;
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
        'h-control w-control items-center justify-center rounded-full active:bg-muted',
        FOCUS_RING,
        disabled && 'opacity-40',
      )}
    >
      <Icon
        name={direction === 'left' ? 'chevron-left' : 'chevron-right'}
        size={20}
        tone="muted"
      />
    </Pressable>
  );
}
