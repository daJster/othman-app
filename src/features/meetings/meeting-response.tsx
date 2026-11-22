import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { api, backendMessageKey, useApiMutation } from '@/api';
import type { Meeting } from '@/core/types';
import { useSessionRole } from '@/features/auth/use-session-role';
import { useFeatures } from '@/features/flags/provider';
import { Button } from '@/ui/button';
import { cn } from '@/ui/cn';
import { Icon } from '@/ui/icon';
import { useToast } from '@/ui/panel';
import { Text } from '@/ui/text';

/**
 * The signed-in reader's answer to a meeting invitation.
 *
 * The server stores the answer as the reader's own attendee row: `going` or
 * `declined`. `unknown` means there is no row for this account yet.
 *
 * Two surfaces consume this one state:
 *  - the card shows answer controls until the reader replies, then a badge;
 *  - the dialog keeps both controls visible so the answer can be changed.
 *
 * `canRespond` requires a real server session. A signed-out visitor sees the
 * meeting but no write affordance — the same rule the rest of the app uses.
 */
export type AttendanceAnswer = 'unknown' | 'accepted' | 'declined';

export function attendanceAnswer(
  meeting: Meeting,
  uid: string | null,
): AttendanceAnswer {
  if (!uid) return 'unknown';

  const mine = meeting.attendees.find((attendee) => attendee.userId === uid);

  if (mine?.status === 'going') return 'accepted';
  if (mine?.status === 'declined') return 'declined';

  return 'unknown';
}

export function useMeetingResponse(meeting: Meeting) {
  const { t } = useTranslation();
  const session = useSessionRole();
  const flags = useFeatures();
  const toast = useToast();
  const rsvp = useApiMutation(api.demo.meetings.rsvp);
  /*
   * The press is the promise; the server is the confirmation. The local answer
   * is trusted only while the card still renders the same meeting object: the
   * refetch mints a new object, which hands control back to the server. That
   * also means clearing the answer cannot resurrect a previous local one.
   */
  const [override, setOverride] = useState<{
    answer: AttendanceAnswer;
    meeting: Meeting;
  } | null>(null);

  const serverAnswer = attendanceAnswer(meeting, session.uid);
  const answer = override?.meeting === meeting ? override.answer : serverAnswer;
  const closed = meeting.status === 'past' || meeting.status === 'canceled';
  const canRespond =
    session.canWrite && !closed && flags.view('meetings.rsvp').writable;

  const respond = (next: AttendanceAnswer) => {
    if (!canRespond) return;

    setOverride({ answer: next, meeting });

    // `null` clears the row, which is how "no answer" is stored.
    const going =
      next === 'accepted' ? true : next === 'declined' ? false : null;

    rsvp.mutate(
      { id: meeting.id, going },
      {
        onError: (error) => {
          // A failed write falls back to the server's answer, not to a guess.
          setOverride((current) =>
            current?.meeting === meeting && current.answer === next
              ? null
              : current,
          );
          toast.show(t(backendMessageKey(error)), { tone: 'error' });
        },
      },
    );
  };

  return { answer, canRespond, pending: rsvp.isPending, respond };
}

/**
 * A declined answer, in the same quiet language as Ended and Canceled: a grey
 * cross with the word beside it, replacing the meeting state.
 *
 * Accepted needs no mark: the Join button is the confirmation. Declined needs
 * one, because its visible consequence is the missing Join.
 */
export function DeclinedMark() {
  const { t } = useTranslation();

  return (
    <View
      testID="my-response:declined"
      className="shrink-0 flex-row items-center gap-1 self-start pt-0.5"
    >
      <Icon name="circle-x" size={14} tone="muted" />
      <Text variant="caption" className="text-muted-foreground">
        {t('meeting.attendance.declined')}
      </Text>
    </View>
  );
}

/**
 * The answers: a check accepts, an X declines. The dialog adds a third,
 * question-mark option that clears the answer and returns the meeting to its
 * default state. The current answer is highlighted rather than removed, so
 * changing it is one press.
 */
export function MeetingResponseActions({
  answer,
  disabled = false,
  showLabels = false,
  allowUnknown = false,
  onRespond,
}: {
  answer: AttendanceAnswer;
  disabled?: boolean;
  showLabels?: boolean;
  allowUnknown?: boolean;
  onRespond: (answer: AttendanceAnswer) => void;
}) {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center gap-1.5">
      <Button
        variant="outline"
        size={showLabels ? 'sm' : 'icon'}
        accessibilityLabel={t('meeting.rsvp.accept')}
        accessibilityState={{
          selected: answer === 'accepted',
          disabled,
        }}
        disabled={disabled}
        onPress={(event) => {
          event.stopPropagation();
          onRespond('accepted');
        }}
        testID="meeting-accept"
        className={cn(
          answer === 'accepted' && 'border-success-line bg-success-soft',
        )}
      >
        <Icon
          name="check"
          size={16}
          tone={answer === 'accepted' ? 'success' : 'muted'}
        />
        {showLabels ? (
          <Text
            variant="caption"
            className={answer === 'accepted' ? 'text-success' : undefined}
          >
            {t('meeting.rsvp.accept')}
          </Text>
        ) : null}
      </Button>

      <Button
        variant="outline"
        size={showLabels ? 'sm' : 'icon'}
        accessibilityLabel={t('meeting.rsvp.decline')}
        accessibilityState={{
          selected: answer === 'declined',
          disabled,
        }}
        disabled={disabled}
        onPress={(event) => {
          event.stopPropagation();
          onRespond('declined');
        }}
        testID="meeting-decline"
        className={cn(
          answer === 'declined' && 'border-destructive/40 bg-destructive/10',
        )}
      >
        <Icon
          name="close"
          size={16}
          tone={answer === 'declined' ? 'destructive' : 'muted'}
        />
        {showLabels ? (
          <Text
            variant="caption"
            className={answer === 'declined' ? 'text-destructive' : undefined}
          >
            {t('meeting.rsvp.decline')}
          </Text>
        ) : null}
      </Button>

      {allowUnknown ? (
        <Button
          variant="outline"
          size={showLabels ? 'sm' : 'icon'}
          accessibilityLabel={t('meeting.attendance.unknown')}
          accessibilityState={{
            selected: answer === 'unknown',
            disabled,
          }}
          disabled={disabled}
          onPress={(event) => {
            event.stopPropagation();
            onRespond('unknown');
          }}
          testID="meeting-unknown"
          className={cn(answer === 'unknown' && 'bg-muted')}
        >
          <Icon name="circle-question" size={16} tone="muted" />
          {showLabels ? (
            <Text variant="caption" className="text-muted-foreground">
              {t('meeting.attendance.unknown')}
            </Text>
          ) : null}
        </Button>
      ) : null}
    </View>
  );
}

/** The dialog's editable block: a label and the three answers, with labels. */
export function MeetingResponseEditor({
  answer,
  canRespond,
  pending,
  onRespond,
}: {
  answer: AttendanceAnswer;
  canRespond: boolean;
  pending: boolean;
  onRespond: (answer: AttendanceAnswer) => void;
}) {
  const { t } = useTranslation();

  if (!canRespond) return null;

  return (
    <View className="gap-2">
      <Text variant="label">{t('meeting.response.label')}</Text>
      <MeetingResponseActions
        answer={answer}
        disabled={pending}
        showLabels
        allowUnknown
        onRespond={onRespond}
      />
    </View>
  );
}
