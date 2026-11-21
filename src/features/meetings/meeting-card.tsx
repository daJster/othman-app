import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { meetingStart } from '@/core/domain/meetings/status';
import type { Meeting } from '@/core/types';
import { useDirection } from '@/i18n';
import { Button, ButtonText } from '@/ui/button';
import { Card } from '@/ui/card';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { AttendeeStack } from './attendee-stack';
import { formatCount, formatDateTime } from './calendar-format';
import { MeetingDetailsDialog } from './meeting-dialog';
import { meetingTitle } from './meeting-display';
import {
  DeclinedMark,
  MeetingResponseActions,
  useMeetingResponse,
} from './meeting-response';
import { MeetingStatusMarker } from './meeting-status';
import { openMeetLink } from './open-meet-link';

/**
 * One session, as a glance.
 *
 * Three lines, in reading order:
 *   1. title — meeting state, or the quiet "Declined" mark when the reader
 *      declined;
 *   2. start — duration;
 *   3. five attendee avatars, the attendee count, and the reader's answer:
 *      accept/decline until they reply, otherwise Join when accepted.
 *
 * Everything else moved into `MeetingDetailsDialog`: the card is a row in a
 * day's schedule, not a place to read a description. The whole card is the
 * target, so the dialog opens from anywhere except the Join button, which keeps
 * its own destination.
 *
 * A past or canceled session renders no Join at all: the room is gone or never
 * opened, and a disabled button would be a promise to nowhere.
 */
export type MeetingCardProps = {
  meeting: Meeting;
};

export function MeetingCard({ meeting }: MeetingCardProps) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const [open, setOpen] = useState(false);
  const response = useMeetingResponse(meeting);

  const title = meetingTitle(meeting, language);
  const start = meetingStart(meeting.date, meeting.time);
  const schedule = `${formatDateTime(start, language)} — ${t(
    'meeting.duration',
    {
      minutes: formatCount(meeting.durationMinutes, language),
    },
  )}`;
  const closed = meeting.status === 'past' || meeting.status === 'canceled';
  const showJoin = !closed && response.answer === 'accepted';

  return (
    <Animated.View layout={LinearTransition.duration(180)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={t('meeting.details')}
        testID="meeting-card"
        onPress={() => setOpen(true)}
        className={cn('rounded-card active:opacity-90', FOCUS_RING)}
      >
        <Card className="gap-2.5" testID="meeting-card-surface">
          <View className="flex-row items-start gap-2">
            <Text variant="subtitle" className="flex-1">
              {title}
            </Text>
            {response.answer === 'declined' ? (
              <DeclinedMark />
            ) : (
              <MeetingStatusMarker status={meeting.status} />
            )}
          </View>

          <Text variant="caption" tone="muted">
            {schedule}
          </Text>

          <View className="flex-row flex-wrap items-center gap-2">
            <AttendeeStack attendees={meeting.attendees} />
            <Text variant="caption" tone="muted">
              {t('meeting.attendees', { count: meeting.attendees.length })}
            </Text>

            <View className="ms-auto flex-row items-center gap-2">
              {response.answer === 'unknown' && response.canRespond ? (
                <MeetingResponseActions
                  answer={response.answer}
                  disabled={response.pending}
                  onRespond={response.respond}
                />
              ) : null}

              {showJoin ? (
                <Button
                  onPress={(event) => {
                    // The card opens the dialog; Join navigates instead.
                    event.stopPropagation();
                    void openMeetLink(meeting.meetLink);
                  }}
                  testID={`meeting-join:${meeting.id}`}
                >
                  <Icon name="video" size={16} tone="primary-foreground" />
                  <ButtonText>{t('action.join')}</ButtonText>
                </Button>
              ) : null}
            </View>
          </View>
        </Card>
      </Pressable>

      <MeetingDetailsDialog
        meeting={meeting}
        open={open}
        onOpenChange={setOpen}
      />
    </Animated.View>
  );
}
