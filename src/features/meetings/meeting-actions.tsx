import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { Meeting } from '@/core/types';
import { api, backendMessageKey, useApiMutation } from '@/api';
import { useSessionRole } from '@/features/auth/use-session-role';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button, ButtonText } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { useToast } from '@/ui/panel';
import { Text } from '@/ui/text';

/**
 * The writes a session card offers.
 *
 * The primary **Join** control belongs to the card itself because it navigates
 * rather than writes; this component owns only what reaches the server:
 *
 *  - **Attend / attending** is the one write an ordinary member owns. It is a
 *    toggle, because RSVP is reversible by design on the server: POST adds the
 *    caller's row, DELETE removes it.
 *  - **Edit / Delete** are administration. They live on a hairline row of their
 *    own and are labelled, not icon-only: a destructive action should be
 *    readable before it is pressed.
 *
 * Signed-out visitors see nothing here. The card is still readable (reads are
 * public), but a write control with no session behind it is a dead end.
 */
export function MeetingCardActions({ meeting }: { meeting: Meeting }) {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const session = useSessionRole();
  const rsvp = useApiMutation(api.demo.meetings.rsvp);
  const remove = useApiMutation(api.demo.meetings.remove);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isPast = meeting.status === 'past';
  const attending =
    session.uid !== null &&
    meeting.attendees.some((attendee) => attendee.userId === session.uid);
  const showRsvp = session.canWrite && !isPast;
  const showAdmin = session.isAdmin;

  if (!showRsvp && !showAdmin) return null;

  const toggleAttendance = () => {
    rsvp.mutate(
      { id: meeting.id, going: !attending },
      {
        onError: (error) =>
          toast.show(t(backendMessageKey(error)), { tone: 'error' }),
      },
    );
  };

  const removeMeeting = () => {
    remove.mutate(
      { id: meeting.id },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          toast.show(t('meeting.delete.done'), { tone: 'success' });
        },
        onError: (error) =>
          toast.show(t(backendMessageKey(error)), { tone: 'error' }),
      },
    );
  };

  return (
    <>
      {showRsvp ? (
        <Button
          variant={attending ? 'secondary' : 'outline'}
          onPress={toggleAttendance}
          disabled={rsvp.isPending}
          accessibilityState={{ checked: attending }}
          testID={`meeting-rsvp:${meeting.id}`}
        >
          <Icon
            name={attending ? 'check' : 'users'}
            size={16}
            tone={attending ? 'primary' : 'muted'}
          />
          <ButtonText
            variant={attending ? 'secondary' : 'outline'}
            className={attending ? undefined : 'text-foreground'}
          >
            {attending ? t('meeting.rsvp.attending') : t('meeting.rsvp.attend')}
          </ButtonText>
        </Button>
      ) : null}

      {showAdmin ? (
        <View className="flex-row items-center gap-1 border-t border-glass-edge pt-2">
          <Button
            variant="ghost"
            size="sm"
            onPress={() =>
              router.push({
                pathname: '/meetings/edit',
                params: { id: String(meeting.id) },
              })
            }
            testID={`meeting-edit:${meeting.id}`}
          >
            <Icon name="pencil" size={16} tone="muted" />
            <ButtonText
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
            >
              {t('action.edit')}
            </ButtonText>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="ms-auto"
            onPress={() => setConfirmOpen(true)}
            disabled={remove.isPending}
            testID={`meeting-delete:${meeting.id}`}
          >
            <Icon name="trash" size={16} tone="destructive" />
            <ButtonText variant="ghost" size="sm" className="text-destructive">
              {t('action.delete')}
            </ButtonText>
          </Button>
        </View>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('meeting.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('meeting.delete.message', { title: meeting.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="h-11"
              onPress={() => setConfirmOpen(false)}
            >
              <Text>{t('action.cancel')}</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-11 bg-destructive"
              onPress={removeMeeting}
              disabled={remove.isPending}
              testID={`meeting-delete-confirm:${meeting.id}`}
            >
              <Text className="text-destructive-foreground">
                {t('action.delete')}
              </Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
