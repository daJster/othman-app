import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
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
import { Icon } from '@/ui/icon';
import { SegmentedControl } from '@/ui/segmented-control';
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
 * RTL needs no special case: `flex-row` starts at the inline start, so the
 * layout is reversed by `LayoutDirection` and Sunday sits on the right. Only
 * the chevrons are mirrored explicitly.
 */
export type MeetingCalendarProps = {
  selectedDate: Date;
  onSelect: (date: Date) => void;
};

const CELL_WIDTH = 'w-[14.2857%]';

export function MeetingCalendar({
  selectedDate,
  onSelect,
}: MeetingCalendarProps) {
  const { t } = useTranslation();
  const { language, isRTL } = useDirection();
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
  }

  function goToToday() {
    const today = new Date();
    setAnchor(today);
    onSelect(today);
  }

  function selectDay(date: Date) {
    // Tapping an outside day also moves the visible month — the expected
    // behaviour of every platform calendar.
    setAnchor(date);
    onSelect(date);
  }

  return (
    <View className="gap-3 rounded-xl border border-border bg-card p-3">
      <View className="flex-row items-center justify-between gap-2">
        <MonthButton
          direction={isRTL ? 'right' : 'left'}
          label={t('meeting.calendar.previous')}
          disabled={!canGoPrevious}
          onPress={() => setAnchor(shiftCalendarMonth(anchor, system, -1))}
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
          direction={isRTL ? 'left' : 'right'}
          label={t('meeting.calendar.next')}
          disabled={!canGoNext}
          onPress={() => setAnchor(shiftCalendarMonth(anchor, system, 1))}
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

          return (
            <View key={day.dateKey} className={cn(CELL_WIDTH, 'p-0.5')}>
              <Pressable
                testID={`calendar-day:${day.dateKey}`}
                accessibilityRole="button"
                accessibilityLabel={formatLongDate(day.date, language)}
                accessibilityState={{ selected }}
                onPress={() => selectDay(day.date)}
                className={cn(
                  'h-11 items-center justify-center rounded-md border active:opacity-70',
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
              </Pressable>
            </View>
          );
        })}
      </View>

      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          label={t('meeting.calendar.system')}
          value={system}
          onChange={changeSystem}
          options={[
            {
              value: 'gregorian',
              label: t('meeting.calendar.gregorian'),
            },
            { value: 'hijri', label: t('meeting.calendar.hijri') },
          ]}
        />
        <Button
          variant="ghost"
          label={t('meeting.calendar.today')}
          onPress={goToToday}
        />
      </View>
    </View>
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
        'h-11 w-11 items-center justify-center rounded-full active:bg-muted',
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
