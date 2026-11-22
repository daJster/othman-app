import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { Meeting } from '@/core/types';
import { api, backendMessageKey, useApiMutation } from '@/api';
import { useSessionRole } from '@/features/auth/use-session-role';
import { useFeatures } from '@/features/flags/provider';
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
export function MeetingCardActions({
  meeting,
  onEdit,
}: {
  meeting: Meeting;
  /** Close the details and open the edit dialog. */
  onEdit?: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const session = useSessionRole();
  const flags = useFeatures();
  const remove = useApiMutation(api.demo.meetings.remove);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const showAdmin = session.isAdmin;
  const canEdit = flags.view('meetings.edit').writable;
  const canDelete = flags.view('meetings.delete').writable;
  const canEditMeeting = Boolean(onEdit) && canEdit;

  if (!showAdmin || (!canEditMeeting && !canDelete)) return null;

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
      <View className="flex-row items-center gap-1 border-t border-glass-edge pt-2">
        {canEditMeeting ? (
          <Button
            variant="ghost"
            size="sm"
            onPress={onEdit}
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
        ) : null}

        {canDelete ? (
          <Button
            variant="ghost"
            size="sm"
            className={canEditMeeting ? 'ms-auto' : undefined}
            onPress={() => setConfirmOpen(true)}
            disabled={remove.isPending}
            testID={`meeting-delete:${meeting.id}`}
          >
            <Icon name="trash" size={16} tone="destructive" />
            <ButtonText variant="ghost" size="sm" className="text-destructive">
              {t('action.delete')}
            </ButtonText>
          </Button>
        ) : null}
      </View>

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
