import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { getMeetingStatusConfig } from '@/core/config';
import type { Meeting } from '@/core/types';
import { Badge } from '@/ui/badge';
import { Button, ButtonText } from '@/ui/button';
import { Card } from '@/ui/card';
import { cn } from '@/ui/cn';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useDirection } from '@/i18n';
import { FOCUS_RING } from '@/ui/focus';
import { Icon } from '@/ui/icon';
import { Separator } from '@/ui/separator';
import { Text } from '@/ui/text';
import { AttendeeStack } from './attendee-stack';
import { formatClockTime, formatCount } from './calendar-format';
import { MeetingCardActions } from './meeting-actions';
import {
  attendeeName,
  meetingDescription,
  meetingLocation,
  meetingOrganizer,
  meetingTitle,
} from './meeting-display';
import { openMeetLink } from './open-meet-link';

/**
 * One session.
 *
 * The card is a schedule row before it is a card: the time owns a fixed rail at
 * the start, so a day's list can be scanned by clock without reading a single
 * title. The status pill sits with the title it describes, and the clock is
 * formatted per language — a stored "2:00 PM" cannot become "٢:٠٠ م".
 *
 * Details stay collapsed because the only decision at a glance is Join; the
 * expanded block carries the description, the organiser and the attendee names.
 * A past session renders no Join at all: the room is gone, and a disabled
 * button would be a promise to nowhere.
 *
 * The footer belongs to `MeetingCardActions`: Join, RSVP and the administrator
 * row are one decision tree (is there a room, am I going, may I change this?),
 * and splitting it across two components is how a card ends up offering an
 * edit button with no session behind it.
 *
 * `LinearTransition` animates the height change and the details fade, so
 * expanding one card does not jump the list.
 */
export type MeetingCardProps = {
  meeting: Meeting;
};

export function MeetingCard({ meeting }: MeetingCardProps) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const [expanded, setExpanded] = useState(false);

  const status = getMeetingStatusConfig(meeting.status);

  const title = meetingTitle(meeting, language);
  const location = meetingLocation(meeting, language);
  const organizer = meetingOrganizer(meeting, language);
  const attendeeNames = meeting.attendees
    .map((attendee) => attendeeName(attendee, language))
    .join(' · ');

  const time = formatClockTime(meeting.time, language);
  const duration = t('meeting.duration', {
    minutes: formatCount(meeting.durationMinutes, language),
  });

  return (
    <Animated.View layout={LinearTransition.duration(180)}>
      <Card className="gap-3" testID="meeting-card">
        <View className="flex-row gap-3">
          {/* The clock rail: fixed width so every title starts on one line. */}
          <View className="w-20 shrink-0 gap-0.5">
            <Text variant="body" className="font-semibold">
              {time}
            </Text>
            <Text variant="caption" tone="muted">
              {duration}
            </Text>
          </View>

          <View className="flex-1 gap-1">
            <View className="flex-row items-start justify-between gap-2">
              <Text variant="subtitle" className="flex-1">
                {title}
              </Text>
              <Badge variant={status.tone} label={t(status.labelKey)} />
            </View>

            <Text variant="caption" tone="muted">
              {location}
            </Text>
          </View>
        </View>

        <Separator />

        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1 flex-row items-center gap-2">
              <Icon name="users" size={16} tone="muted" />
              <AttendeeStack attendees={meeting.attendees} />
              <Text variant="caption" tone="muted">
                {t('meeting.attendees', { count: meeting.attendees.length })}
              </Text>
            </View>

            <CollapsibleTrigger asChild>
              <Pressable
                accessibilityRole="button"
                className={cn(
                  'min-h-control flex-row items-center gap-1 rounded-chip px-1 active:opacity-70',
                  FOCUS_RING,
                )}
              >
                <Text variant="label" tone="muted">
                  {expanded ? t('meeting.less') : t('meeting.details')}
                </Text>
                <Icon
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  tone="muted"
                />
              </Pressable>
            </CollapsibleTrigger>
          </View>

          <CollapsibleContent>
            <Animated.View
              entering={FadeIn.duration(160)}
              exiting={FadeOut.duration(120)}
              className="gap-2 pt-2"
            >
              <Text variant="caption" className="leading-relaxed">
                {meetingDescription(meeting, language)}
              </Text>
              <Text variant="caption" tone="muted">
                {t('meeting.organizedBy', { name: organizer })}
              </Text>
              {attendeeNames ? (
                <Text variant="caption" tone="muted">
                  {attendeeNames}
                </Text>
              ) : null}
            </Animated.View>
          </CollapsibleContent>
        </Collapsible>

        <View className="flex-row flex-wrap items-center gap-2">
          {meeting.status === 'past' ? null : (
            <Button
              onPress={() => void openMeetLink(meeting.meetLink)}
              testID={`meeting-join:${meeting.id}`}
            >
              <Icon name="video" size={16} tone="primary-foreground" />
              <ButtonText>{t('action.join')}</ButtonText>
            </Button>
          )}

          <MeetingCardActions meeting={meeting} />
        </View>
      </Card>
    </Animated.View>
  );
}
