import Head from 'expo-router/head';
import { useRouter, usePathname } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Platform,
  RefreshControl,
  View,
  type FlatListProps,
} from 'react-native';
import {
  formatDateKey,
  isDateKey,
  parseDateKey,
} from '@/core/domain/meetings/date-key';
import type { Meeting } from '@/core/types';
import { MeetingCalendar } from '@/features/meetings/meeting-calendar';
import { MeetingCard } from '@/features/meetings/meeting-card';
import { MeetingFormDialog } from '@/features/meetings/meeting-form-dialog';
import { RequireAuth } from '@/features/auth/require-auth';
import { useSessionRole } from '@/features/auth/use-session-role';
import {
  useMeetingDays,
  useMeetingsByDate,
  useRefreshMeetings,
} from '@/features/meetings/use-meetings';
import {
  formatShortDate,
  formatLongDate,
} from '@/features/meetings/calendar-format';
import { useDirection } from '@/i18n';
import { useAuth } from '@/providers/auth-context';
import { Button, ButtonText } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Page } from '@/ui/page';
import { ScreenView } from '@/ui/screen';
import { Section } from '@/ui/section';
import { Spinner } from '@/ui/spinner';
import { EmptyState, ErrorState } from '@/ui/states';
import { Text } from '@/ui/text';
import { FeatureGate } from '@/features/flags/gates';

/**
 * Meetings tab.
 *
 * The calendar and the list share one scroll container: the calendar is the
 * `ListHeaderComponent`, so a short day still scrolls as one surface and the
 * list keeps FlatList's virtualisation and pull-to-refresh.
 *
 * Four states, in the order the user can meet them:
 *  - pending — the shared spinner under the calendar (the calendar must not
 *    vanish when a day is loading);
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
      <MeetingsGate />
    </RequireAuth>
  );
}

/**
 * Real session, not the development identity.
 *
 * Gating is off while the app is being built, so the tab stays reachable
 * without a session. The list endpoint scopes a signed-in reader to their own
 * invitations but keeps a public read for an anonymous caller; showing that
 * public list inside "my meetings" is exactly the confusion this gate removes.
 * Signing in is the only way to see a meeting list here, and the sign-in screen
 * carries the one-tap demo accounts.
 */
function MeetingsGate() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { user, status } = useAuth();

  if (status === 'restoring') {
    return (
      <ScreenView>
        <Spinner size="lg" label={t('action.loading')} />
      </ScreenView>
    );
  }

  if (!user) {
    return (
      <ScreenView>
        <Head>
          <title>{`${t('nav.meetings')} · ${t('app.name')}`}</title>
        </Head>
        <EmptyState
          title={t('page.meetings.signedOut.title')}
          description={t('page.meetings.signedOut.description')}
          actionLabel={t('account.signedOut.action')}
          onAction={() =>
            router.push({
              pathname: '/auth/sign-in',
              params: { returnTo: pathname },
            })
          }
        />
      </ScreenView>
    );
  }

  return <MeetingsContent />;
}

function MeetingsContent() {
  const { t } = useTranslation();
  const { language } = useDirection();
  const session = useSessionRole();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [createOpen, setCreateOpen] = useState(false);

  const dateKey = formatDateKey(selectedDate);
  const { state, isFetching } = useMeetingsByDate(dateKey);
  const markedDays = useMeetingDays();
  const refresh = useRefreshMeetings();

  const meetings = state.status === 'ready' ? state.data : [];

  /**
   * The next day that holds a session, when the selected one is empty.
   *
   * A blank day is a dead end unless the page offers a way out; the calendar
   * dots show *where*, this names *when* and takes the reader there in one
   * press. Derived from the same density map the grid marks, so it can never
   * point at a day the calendar does not show as occupied.
   */
  const nextSessionDay = useMemo(() => {
    if (state.status !== 'empty') return null;

    const nextKey = [...markedDays.keys()]
      .filter((key) => key > dateKey)
      .sort()
      .find(isDateKey);

    return nextKey ? parseDateKey(nextKey) : null;
  }, [dateKey, markedDays, state.status]);

  /*
   * The list is the page's scroller, and on web the document does not move, so
   * a keyboard user needs the list itself to be a focusable, named region —
   * the same fix the home surface uses.
   */
  const regionProps = (
    Platform.OS === 'web'
      ? {
          tabIndex: 0,
          role: 'region',
          'aria-label': t('page.meetings.header.title'),
        }
      : {}
  ) as FlatListProps<Meeting>;

  return (
    <>
      <Head>
        <title>{`${t('nav.meetings')} · ${t('app.name')}`}</title>
      </Head>

      {/*
       * The gutter belongs to `Page`, which already applies `PAGE_GUTTER`. The
       * list used to repeat it on its content container, so the page carried a
       * double gutter (32 px on a phone, 40 px from `sm` up) and its cards sat
       * narrower than every other screen. The list now only owns its vertical
       * rhythm, and the safe-area inset moves to the page so it applies to the
       * scroll viewport rather than to the content that scrolls under the bar.
       */}
      <Page width="default" className="flex-1 pt-safe">
        <FlatList
          {...regionProps}
          data={meetings}
          keyExtractor={(meeting) => String(meeting.id)}
          renderItem={({ item }) => <MeetingCard meeting={item} />}
          className="flex-1 bg-background"
          contentContainerClassName="gap-3 py-4 pb-10"
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl
              refreshing={isFetching && state.status === 'ready'}
              onRefresh={() => void refresh()}
            />
          }
          ListHeaderComponent={
            <View className="gap-4">
              <View className="flex-row items-start justify-between gap-3">
                <Section
                  title={t('page.meetings.header.title')}
                  className="flex-1"
                />

                {session.isAdmin ? (
                  <FeatureGate feature="meetings.create">
                    <Button
                      size="sm"
                      className="shrink-0"
                      testID="meeting-create"
                      onPress={() => setCreateOpen(true)}
                    >
                      <Icon name="plus" size={16} tone="primary-foreground" />
                      <ButtonText size="sm">{t('meeting.create')}</ButtonText>
                    </Button>
                  </FeatureGate>
                ) : null}
              </View>

              <MeetingCalendar
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
                markedDays={markedDays}
              />

              {/* The empty state carries the date itself as its overline. */}
              {state.status !== 'empty' ? (
                <View className="flex-row items-baseline justify-between gap-3">
                  <Text variant="subtitle" className="min-w-0 flex-1">
                    {formatLongDate(selectedDate, language)}
                  </Text>
                  {state.status === 'ready' ? (
                    <Text
                      variant="caption"
                      tone="muted"
                      className="shrink-0"
                      align="end"
                    >
                      {t('meeting.found', { count: meetings.length })}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            state.status === 'pending' ? (
              <View
                testID="meetings-loading"
                className="items-center justify-center py-16"
              >
                <Spinner size="lg" label={t('home.rail.loading')} />
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
                {nextSessionDay ? (
                  <Button
                    variant="link"
                    size="sm"
                    testID="meeting-next-session"
                    label={t('meeting.nextSession', {
                      date: formatShortDate(nextSessionDay, language),
                    })}
                    onPress={() => setSelectedDate(nextSessionDay)}
                  />
                ) : null}
              </View>
            )
          }
        />
      </Page>

      {createOpen ? (
        <MeetingFormDialog
          open
          meeting={null}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}
    </>
  );
}
