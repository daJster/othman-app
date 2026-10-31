import Head from 'expo-router/head';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, View } from 'react-native';
import { formatDateKey } from '@/core/domain/meetings/date-key';
import { MeetingCalendar } from '@/features/meetings/meeting-calendar';
import { MeetingCard } from '@/features/meetings/meeting-card';
import { MeetingCardSkeleton } from '@/features/meetings/meeting-card-skeleton';
import { RequireAuth } from '@/features/auth/require-auth';
import {
  useMeetingsByDate,
  useRefreshMeetings,
} from '@/features/meetings/use-meetings';
import { formatLongDate } from '@/features/meetings/calendar-format';
import { useDirection } from '@/i18n';
import { EmptyState, ErrorState } from '@/ui/states';
import { Text } from '@/ui/text';

/**
 * Meetings tab.
 *
 * The calendar and the list share one scroll container: the calendar is the
 * `ListHeaderComponent`, so a short day still scrolls as one surface and the
 * list keeps FlatList's virtualisation and pull-to-refresh.
 *
 * Four states, in the order the user can meet them:
 *  - pending — skeleton cards under the calendar (the calendar must not vanish
 *    when a day is loading);
 *  - error — `ErrorState` with the query's own retry;
 *  - empty — the selected day has no meetings;
 *  - ready — the cards.
 *
 * "Today" is captured once for the initial selection, then days come from the
 * calendar as local dates. The query key is the `YYYY-MM-DD` key, so changing
 * the selected day changes the key and fetches that day exactly once.
 */
export default function MeetingsScreen() {
  return (
    <RequireAuth>
      <MeetingsContent />
    </RequireAuth>
  );
}

function MeetingsContent() {
  const { t } = useTranslation();
  const { language } = useDirection();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  const dateKey = formatDateKey(selectedDate);
  const { state, isFetching } = useMeetingsByDate(dateKey);
  const refresh = useRefreshMeetings();

  const meetings = state.status === 'ready' ? state.data : [];

  return (
    <>
      <Head>
        <title>{`${t('nav.meetings')} · ${t('app.name')}`}</title>
      </Head>

      <FlatList
        data={meetings}
        keyExtractor={(meeting) => String(meeting.id)}
        renderItem={({ item }) => <MeetingCard meeting={item} />}
        className="flex-1 bg-background"
        contentContainerClassName="gap-3 p-4 pb-10"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={isFetching && state.status === 'ready'}
            onRefresh={() => void refresh()}
          />
        }
        ListHeaderComponent={
          <View className="gap-4">
            <View className="gap-1">
              <Text variant="title" accessibilityRole="header">
                {t('page.meetings.header.title')}
              </Text>
              <Text tone="muted">{t('page.meetings.header.description')}</Text>
            </View>

            <MeetingCalendar
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
            />

            <View className="gap-0.5">
              <Text variant="subtitle">
                {formatLongDate(selectedDate, language)}
              </Text>
              {state.status === 'ready' ? (
                <Text variant="caption" tone="muted">
                  {t('meeting.found', { count: meetings.length })}
                </Text>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          state.status === 'pending' ? (
            <View className="gap-3">
              {[0, 1, 2].map((index) => (
                <MeetingCardSkeleton key={index} />
              ))}
            </View>
          ) : state.status === 'error' ? (
            <ErrorState
              className="py-10"
              title={t('state.errorTitle')}
              description={t('state.errorDescription')}
              onRetry={state.retry}
            />
          ) : (
            <EmptyState
              className="py-10"
              title={t('page.meetings.list.empty')}
            />
          )
        }
      />
    </>
  );
}
