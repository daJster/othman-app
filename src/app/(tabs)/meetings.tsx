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
import { Page, PAGE_GUTTER } from '@/ui/page';
import { Section } from '@/ui/section';
import { ErrorState } from '@/ui/states';
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

      {/*
       * One column, measured rather than viewport-wide: on a desktop the day
       * cells used to stretch to ~195 px each, which read as a table of boxes
       * instead of a calendar. The single FlatList (with the calendar in its
       * header) keeps pull-to-refresh and virtualisation intact.
       */}
      <Page width="default" className="flex-1">
        <FlatList
          data={meetings}
          keyExtractor={(meeting) => String(meeting.id)}
          renderItem={({ item }) => <MeetingCard meeting={item} />}
          className="flex-1 bg-background"
          contentContainerClassName={`${PAGE_GUTTER} gap-3 py-4 pb-10`}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl
              refreshing={isFetching && state.status === 'ready'}
              onRefresh={() => void refresh()}
            />
          }
          ListHeaderComponent={
            <View className="gap-4">
              <Section
                title={t('page.meetings.header.title')}
                description={t('page.meetings.header.description')}
              />

              <MeetingCalendar
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
              />

              {/* The empty state carries the date itself as its overline. */}
              {state.status !== 'empty' ? (
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
              ) : null}
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
              /*
               * Typographic, not an illustration: the selected date as a quiet
               * brass overline (the header omits its own copy for this state),
               * the copy the screen already owns, and a muted second line. No
               * icon, no new locale keys, no action that would invent a flow.
               */
              <View className="items-center gap-1.5 border-t border-border py-10">
                <Text variant="subtitle" className="text-center">
                  {formatLongDate(selectedDate, language)}
                </Text>
                <Text variant="caption" tone="muted" className="text-center">
                  {t('page.meetings.list.empty')}
                </Text>
              </View>
            )
          }
        />
      </Page>
    </>
  );
}
