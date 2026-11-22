import { useTranslation } from 'react-i18next';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { meetingEnd, meetingStart } from '@/core/domain/meetings/status';
import type { AttendeeStatus, Meeting } from '@/core/types';
import { useDirection } from '@/i18n';
import { Avatar } from '@/ui/avatar';
import { Button, ButtonText } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { formatCount, formatDateTime } from './calendar-format';
import { MeetingCardActions } from './meeting-actions';
import {
  attendeeName,
  meetingDescription,
  meetingOrganizer,
  meetingTitle,
} from './meeting-display';
import { MeetingResponseEditor, useMeetingResponse } from './meeting-response';
import { MeetingStatusMarker } from './meeting-status';
import { openMeetLink } from './open-meet-link';

/**
 * The meeting's full record, in the shared glass dialog.
 *
 * The card is a glance; this is the surface for reading. It answers, in order:
 * what and when, what it is about, and who is coming — the organiser first,
 * wearing the graduation cap, then the attendee list with each invitation
 * answer.
 *
 * The three invitation states are one mapping, not three copies of a component:
 *
 *  - no answer (`invited`) → grey question mark;
 *  - accepted (`going`)    → green check;
 *  - declined              → red cross.
 *
 * A signed-in reader can change their answer here with the three controls under
 * the dates — accept, decline, or clear the answer back to the default. The card
 * reflects the same answer as a Join button (accepted) or the quiet declined
 * mark in its title row. Answers sort ahead of silence — accepted, then
 * declined, then unknown — with the organiser pinned first.
 *
 * The attendee list is its own scroll view: five rows are visible and the rest
 * scrolls, so a long cohort never pushes Join or the actions off a phone
 * screen. A measured `height`, not `maxHeight`, is deliberate —
 * Android's ScrollView does not scroll when only a maximum is provided.
 */
/** Rows kept visible before the list scrolls. */
const ATTENDEE_VISIBLE_ROWS = 5;
/** Approximate attendee row pitch (avatar + gap). */
const ATTENDEE_ROW_HEIGHT = 40;

export type MeetingDetailsDialogProps = {
  meeting: Meeting;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Close this dialog and open the edit dialog. */
  onEdit?: () => void;
};

export function MeetingDetailsDialog({
  meeting,
  open,
  onOpenChange,
  onEdit,
}: MeetingDetailsDialogProps) {
  const { width } = useWindowDimensions();
  const dialogWidth = Math.min(width - 24, 512);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        testID="meeting-dialog"
        className="max-w-lg"
        style={{ width: dialogWidth }}
      >
        <MeetingDetails meeting={meeting} onEdit={onEdit} />
      </DialogContent>
    </Dialog>
  );
}

export function MeetingDetails({
  meeting,
  onEdit,
}: {
  meeting: Meeting;
  onEdit?: () => void;
}) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const response = useMeetingResponse(meeting);
  const closed = meeting.status === 'past' || meeting.status === 'canceled';
  const showJoin = !closed && response.answer === 'accepted';

  const start = meetingStart(meeting.date, meeting.time);
  const end = meetingEnd(meeting.date, meeting.time, meeting.durationMinutes);
  const duration = t('meeting.duration', {
    minutes: formatCount(meeting.durationMinutes, language),
  });
  // Five rows visible, the rest scrolls; the organiser counts as a row.
  const attendeeRows = meeting.attendees.length + 1;
  const attendeeListHeight =
    Math.min(attendeeRows, ATTENDEE_VISIBLE_ROWS) * ATTENDEE_ROW_HEIGHT;
  const orderedAttendees = [...meeting.attendees].sort(
    (a, b) => attendanceRank(a.status) - attendanceRank(b.status),
  );

  return (
    <View className="gap-4">
      <DialogHeader className="gap-1.5 pr-8">
        <View className="flex-row items-start gap-2 py-0.5">
          <DialogTitle className="shrink">
            {meetingTitle(meeting, language)}
          </DialogTitle>
          <MeetingStatusMarker status={meeting.status} />
        </View>

        <Text variant="caption" tone="muted">
          {`${formatDateTime(start, language)} — ${formatDateTime(
            end,
            language,
          )}`}
        </Text>

        <Text variant="caption" tone="muted">
          {duration}
        </Text>
      </DialogHeader>

      <MeetingResponseEditor
        answer={response.answer}
        canRespond={response.canRespond}
        pending={response.pending}
        onRespond={response.respond}
      />

      {meetingDescription(meeting, language).trim() ? (
        <View className="gap-1.5">
          <Text variant="label">{t('meeting.details')}</Text>
          <Text variant="caption" className="leading-relaxed">
            {meetingDescription(meeting, language)}
          </Text>
        </View>
      ) : null}

      <View className="gap-2">
        <Text variant="label">{t('meeting.attendeesTitle')}</Text>

        {/* The list scrolls on its own, so a long cohort never clips the
            dialog or pushes Join off the screen. */}
        <ScrollView
          style={{ height: attendeeListHeight, width: '100%' }}
          contentContainerClassName="gap-2"
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          <AttendeeRow
            name={meetingOrganizer(meeting, language)}
            role="organizer"
            status="going"
          />

          {orderedAttendees.map((attendee, index) => (
            <AttendeeRow
              key={`${attendee.name}-${index}`}
              name={attendeeName(attendee, language)}
              avatar={attendee.avatar}
              role="attendee"
              status={attendee.status}
            />
          ))}
        </ScrollView>
      </View>

      {showJoin ? (
        <Button
          onPress={() => void openMeetLink(meeting.meetLink)}
          testID={`meeting-dialog-join:${meeting.id}`}
        >
          <Icon name="video" size={16} tone="primary-foreground" />
          <ButtonText>{t('action.join')}</ButtonText>
        </Button>
      ) : null}

      <MeetingCardActions meeting={meeting} onEdit={onEdit} />
    </View>
  );
}

type AttendanceState = 'unknown' | 'accepted' | 'declined';

const ATTENDANCE = {
  unknown: {
    icon: 'circle-question',
    tone: 'muted',
    labelKey: 'meeting.attendance.unknown',
  },
  accepted: {
    icon: 'check-circle',
    tone: 'success',
    labelKey: 'meeting.attendance.accepted',
  },
  declined: {
    icon: 'circle-x',
    tone: 'destructive',
    labelKey: 'meeting.attendance.declined',
  },
} as const;

function attendanceOf(status: AttendeeStatus | undefined): AttendanceState {
  if (status === 'going') return 'accepted';
  if (status === 'declined') return 'declined';

  return 'unknown';
}

/**
 * The attendee order: answers first, silence last. Within a group the original
 * order is kept, so two accepted attendees do not shuffle on every render.
 */
const ATTENDANCE_RANK: Readonly<Record<AttendanceState, number>> = {
  accepted: 0,
  declined: 1,
  unknown: 2,
};

function attendanceRank(status: AttendeeStatus | undefined): number {
  return ATTENDANCE_RANK[attendanceOf(status)];
}

function AttendeeRow({
  name,
  avatar,
  role,
  status,
}: {
  name: string;
  avatar?: string;
  role: 'organizer' | 'attendee';
  status: AttendeeStatus | undefined;
}) {
  const { t } = useTranslation();
  const state = attendanceOf(status);
  const attendance = ATTENDANCE[state];

  return (
    <View className="flex-row items-center gap-3">
      <Avatar src={avatar} name={name} size="md" />

      <View
        testID={`attendee-role:${role}`}
        className="flex-1 flex-row items-center gap-1.5"
      >
        <Text variant="body" numberOfLines={1} className="shrink">
          {name}
        </Text>
        <Icon
          name={role === 'organizer' ? 'graduation-cap' : 'user'}
          size={14}
          tone="muted"
        />
      </View>

      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t(attendance.labelKey)}
        testID={`attendee-state:${state}`}
      >
        <Icon name={attendance.icon} size={18} tone={attendance.tone} />
      </View>
    </View>
  );
}
