import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type ViewProps } from 'react-native';
import { Button, ButtonText } from '../button';
import { cn } from '../cn';
import { FOCUS_RING } from '../focus';
import { Icon } from '../icon';
import { Pressable } from '../pressable';
import { Text } from '../text';
import { Textarea } from '../textarea';
import { Spinner } from './spinner';

/**
 * A short feedback form.
 *
 * Two fields are enough: how it felt (one to five) and one optional sentence.
 * The rating is a row of real buttons rather than a slider, because a slider
 * on a phone is a precision gesture for a coarse answer and it cannot be driven
 * by a screen reader. The message is a `Textarea`, and submitting is the only
 * filled action in the surface.
 *
 * The form owns its own pending and error states; the caller only supplies
 * `onSubmit` and decides where the saved note goes. That keeps it reusable in
 * a dialog, a sheet or a dedicated page.
 */
export type FeedbackValue = {
  rating: number;
  message: string;
};

export type FeedbackProps = Omit<ViewProps, 'children'> & {
  onSubmit: (value: FeedbackValue) => Promise<void> | void;
  onCancel?: () => void;
  testID?: string;
};

const RATINGS = [1, 2, 3, 4, 5] as const;

export function Feedback({
  onSubmit,
  onCancel,
  className,
  testID,
  ...props
}: FeedbackProps) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (rating === 0) {
      setError(t('account.feedback.required'));
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await onSubmit({ rating, message: message.trim() });
      setRating(0);
      setMessage('');
    } catch {
      setError(t('account.feedback.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View testID={testID} className={cn('gap-4', className)} {...props}>
      <View className="gap-2">
        <View className="flex-row items-center justify-between gap-2">
          <Text variant="label">{t('account.feedback.rating')}</Text>
          {rating > 0 ? (
            <Text variant="caption" tone="muted">
              {t('account.feedback.ratingValue', { value: rating })}
            </Text>
          ) : null}
        </View>
        <View className="flex-row items-center gap-1">
          {RATINGS.map((value) => {
            const selected = value <= rating;

            return (
              <Pressable
                key={value}
                testID={`feedback-rating:${value}`}
                accessibilityRole="button"
                accessibilityLabel={t('account.feedback.ratingA11y', { value })}
                accessibilityState={{ selected: value === rating }}
                onPress={() => {
                  setRating(value);
                  setError(null);
                }}
                className={cn(
                  'h-11 w-11 items-center justify-center rounded-md active:opacity-70',
                  FOCUS_RING,
                )}
              >
                <Icon
                  name="star"
                  size={26}
                  tone={selected ? 'primary' : 'muted'}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-2">
        <Text variant="label">{t('account.feedback.message')}</Text>
        <Textarea
          testID="feedback-message"
          value={message}
          onChangeText={setMessage}
          placeholder={t('account.feedback.messagePlaceholder')}
          accessibilityLabel={t('account.feedback.message')}
          maxLength={600}
        />
      </View>

      {error ? (
        <Text variant="caption" tone="destructive">
          {error}
        </Text>
      ) : null}

      <View className="flex-row items-center justify-end gap-2">
        {onCancel ? (
          <Button
            variant="ghost"
            size="sm"
            label={t('action.cancel')}
            onPress={onCancel}
            disabled={submitting}
          />
        ) : null}
        <Button
          testID="feedback-submit"
          size="sm"
          onPress={() => void submit()}
          disabled={submitting}
        >
          {submitting ? (
            <Spinner size="sm" />
          ) : (
            <Icon name="send" size={16} tone="primary-foreground" />
          )}
          <ButtonText>
            {submitting
              ? t('account.feedback.sending')
              : t('account.feedback.submit')}
          </ButtonText>
        </Button>
      </View>
    </View>
  );
}
