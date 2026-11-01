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
import { Icon } from '@/ui/icon';
import { Separator } from '@/ui/separator';
import { Text } from '@/ui/text';
import { AttendeeStack } from './attendee-stack';
import { openMeetLink } from './open-meet-link';

/**
 * One meeting.
 *
 * The status pill is the same `Badge` the design system already uses, fed by
 * `getMeetingStatusConfig(status).tone` — the tone words live in `core`, the
 * class literals in `ui/tone.ts`, and this file only passes one to the other.
 *
 * Details are collapsed by default because the list can hold several cards and
 * the only action that matters at a glance is Join. Reanimated's layout
 * transition animates the card's height, and the details themselves fade in, so
 * expansion does not jump.
 *
 * The card omits the date on purpose: the Meetings screen is scoped to one
 * selected day and prints it once above the list.
 *
 * Attendee names are in the expanded block rather than a long-press tooltip:
 * there is no hover on a phone, and a hidden gesture is not an accessible way to
 * read four names.
 */
export type MeetingCardProps = {
  meeting: Meeting;
};

export function MeetingCard({ meeting }: MeetingCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const status = getMeetingStatusConfig(meeting.status);
  const attendeeNames = meeting.attendees
    .map((attendee) => attendee.name)
    .join(' · ');

  return (
    <Animated.View layout={LinearTransition.duration(180)}>
      <Card className="gap-3">
        <View className="gap-2">
          <Badge variant={status.tone} label={t(status.labelKey)} />
          <Text variant="subtitle">{meeting.title}</Text>
        </View>

        <View className="gap-1.5">
          <MetaRow
            icon="clock"
            label={`${meeting.time} · ${meeting.duration}`}
          />
          <MetaRow icon="map-pin" label={meeting.location} />
        </View>

        <Separator />

        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-1 flex-row items-center gap-2">
            <Icon name="users" size={16} tone="muted" />
            <AttendeeStack attendees={meeting.attendees} />
            <Text variant="caption" tone="muted">
              {t('meeting.attendees', { count: meeting.attendees.length })}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={() => setExpanded((previous) => !previous)}
            className="min-h-11 flex-row items-center gap-1 rounded-md px-1 active:opacity-70"
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
        </View>

        {expanded ? (
          <Animated.View
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(120)}
            className="gap-2"
          >
            <Text variant="caption" className="leading-relaxed">
              {meeting.description}
            </Text>
            <Text variant="caption" tone="muted">
              {t('meeting.organizedBy', { name: meeting.organizer })}
            </Text>
            {attendeeNames ? (
              <Text variant="caption" tone="muted">
                {attendeeNames}
              </Text>
            ) : null}
          </Animated.View>
        ) : null}

        <Button
          className="self-start"
          onPress={() => void openMeetLink(meeting.meetLink)}
        >
          <Icon name="video" size={16} tone="primary-foreground" />
          <ButtonText>{t('action.join')}</ButtonText>
        </Button>
      </Card>
    </Animated.View>
  );
}

function MetaRow({
  icon,
  label,
}: {
  icon: 'clock' | 'map-pin';
  label: string;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <Icon name={icon} size={14} tone="muted" />
      <Text variant="caption" tone="muted" className="flex-1">
        {label}
      </Text>
    </View>
  );
}
