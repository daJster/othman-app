import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
import type { AccountData } from '@/core/types';
import { useDirection } from '@/i18n';
import { Avatar } from '@/ui/avatar';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { cn } from '@/ui/cn';
import { Text } from '@/ui/text';
import { roleLabelKey } from './role-label';

/**
 * Account header.
 *
 * Rendered inside the `@expo/ui` `List` as an `RNHostView` on device, and
 * directly inside the web page container on web, so it scrolls with the rows
 * instead of floating above a second scroll surface. Everything here is an
 * ordinary RN component: the native list owns the rows, while the header needs
 * a layout SwiftUI/Compose would fight (avatar + identity + button).
 *
 * The identity is a hairline block, not a rounded card. Its text column is
 * capped (`max-w-md`) so at 1440 the name, email and role stay next to the
 * avatar and the Edit button instead of splitting across a 1200px row. Nothing
 * is clamped: the display name wraps, because DESIGN.md forbids clipping prose.
 *
 * The role is a `Badge` rather than an input: it is read-only on this screen at
 * every privilege level — editing it happens in the sheet, and only for
 * administrators.
 */
export type ProfileHeaderProps = {
  account: AccountData;
  onEdit: () => void;
};

export function ProfileHeader({ account, onEdit }: ProfileHeaderProps) {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  const textAlign = isRTL ? 'right' : 'left';

  return (
    <View
      className={cn(
        'flex-row items-start gap-4 border-b border-border p-4',
        // Yoga already flips `row` for RTL on device; RN Web does not, so the
        // reversal is only added there.
        Platform.OS === 'web' && isRTL && 'flex-row-reverse',
      )}
    >
      <Avatar
        size="xl"
        src={account.photoURL}
        name={account.displayName}
        accessibilityLabel={t('account.a11y.profilePhoto')}
      />

      <View
        className={cn(
          'min-w-0 flex-1 gap-1',
          Platform.OS === 'web' && 'md:max-w-md',
        )}
        style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}
      >
        <Text variant="subtitle" style={{ textAlign }}>
          {account.displayName ?? t('account.profile.anonymous')}
        </Text>
        <Text variant="caption" tone="muted" style={{ textAlign }}>
          {account.email ?? t('account.profile.noEmail')}
        </Text>
        <Badge
          variant="outline"
          label={t(roleLabelKey(account.role))}
          className={cn('mt-1', isRTL ? 'self-end' : 'self-start')}
        />
      </View>

      <Button
        variant="outline"
        size="md"
        label={t('action.edit')}
        accessibilityLabel={t('account.a11y.edit')}
        onPress={onEdit}
        testID="account-edit-button"
      />
    </View>
  );
}
