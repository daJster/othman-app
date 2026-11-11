import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
import type { AccountData } from '@/core/types';
import { Button } from '@/ui/button';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { Icon } from '@/ui/icon';
import {
  Steps,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  type StepItem,
} from '@/ui/panel';
import { Pressable } from '@/ui/pressable';
import { Text } from '@/ui/text';

/**
 * Profile completeness.
 *
 * Three fields are the difference between an account that belongs to a person
 * and one that belongs to a uid: a name, a photo and a phone number. The list
 * is derived from the account itself, so it cannot drift from the profile, and
 * the first missing field is the "current" step rather than a fourth badge.
 *
 * It sits in the header rhythm (hairline, no card) because it is a reading
 * aid, not a task manager: one link takes the reader to the edit sheet.
 */
export type ProfileCompletenessProps = {
  account: AccountData;
  onEdit: () => void;
  className?: string;
};

export function ProfileCompleteness({
  account,
  onEdit,
  className,
}: ProfileCompletenessProps) {
  const { t } = useTranslation();

  const fields = [
    {
      key: 'name',
      label: t('account.completeness.name'),
      complete: Boolean(account.displayName?.trim()),
    },
    {
      key: 'photo',
      label: t('account.completeness.photo'),
      complete: Boolean(account.photoURL),
    },
    {
      key: 'phone',
      label: t('account.completeness.phone'),
      complete: Boolean(account.phoneNumber?.trim()),
    },
  ] as const;

  const done = fields.filter((field) => field.complete).length;
  const firstMissing = fields.findIndex((field) => !field.complete);

  const steps: StepItem[] = fields.map((field, index) => ({
    key: field.key,
    label: field.label,
    status: field.complete
      ? 'complete'
      : index === firstMissing
        ? 'current'
        : 'upcoming',
  }));

  return (
    <View
      testID="profile-completeness"
      className={cn(
        'gap-3 border-b border-glass-edge py-4',
        Platform.OS !== 'web' && 'px-4',
        className,
      )}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-0.5">
          <Text variant="overline" tone="muted">
            {t('account.completeness.title')}
          </Text>
          <Text variant="label">
            {t('account.completeness.progress', {
              done,
              total: fields.length,
            })}
          </Text>
        </View>

        <Tooltip>
          <TooltipTrigger asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('account.completeness.hint')}
              className={cn(
                'h-11 w-11 items-center justify-center rounded-full active:opacity-70',
                FOCUS_RING,
              )}
            >
              <Icon name="info" size={16} tone="muted" />
            </Pressable>
          </TooltipTrigger>
          <TooltipContent>
            <Text variant="caption">{t('account.completeness.hint')}</Text>
          </TooltipContent>
        </Tooltip>
      </View>

      <Steps
        steps={steps}
        testID="profile-completeness-steps"
        className="pt-1"
      />

      {done < fields.length ? (
        <Button
          variant="link"
          size="sm"
          label={t('account.completeness.action')}
          onPress={onEdit}
          className="self-start"
        />
      ) : null}
    </View>
  );
}
