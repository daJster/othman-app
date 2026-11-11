import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Feedback,
  useToast,
  type FeedbackValue,
} from '@/ui/panel';
import { saveFeedback } from './feedback-store';

/**
 * The feedback surface.
 *
 * A dialog rather than a sheet because this is a short, focused task with an
 * explicit finish: the page stays behind it, the form has one primary action,
 * and closing is unambiguous. The form itself is the shared `Feedback`
 * component, so the same control can move into the reader later without a
 * second implementation.
 */
export type FeedbackDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function FeedbackDialog({ open, onClose }: FeedbackDialogProps) {
  const { t } = useTranslation();
  const { show } = useToast();

  const submit = async (value: FeedbackValue) => {
    await saveFeedback(value);
    show(t('account.feedback.saved'), { tone: 'success' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent testID="feedback-dialog" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('account.feedback.title')}</DialogTitle>
          <DialogDescription>
            {t('account.feedback.description')}
          </DialogDescription>
        </DialogHeader>

        <Feedback testID="feedback-form" onSubmit={submit} onCancel={onClose} />
      </DialogContent>
    </Dialog>
  );
}
