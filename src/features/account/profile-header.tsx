import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
import type { AccountData } from '@/core/types';
import { Avatar } from '@/ui/avatar';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { Icon } from '@/ui/icon';
import { Pressable } from '@/ui/pressable';
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
 * The identity column is itself the "open profile" control: a separate button
 * beside Edit would crowd a 375 px row and split the same intent across two
 * targets. The chevron and the "View details" line make the drawer discoverable
 * without turning the whole header into an unlabeled link.
 *
 * The identity is a hairline block, not a rounded card. Its text column is
 * capped (`max-w-md`) so at 1440 the name, email and role stay next to the
 * avatar and the Edit button instead of splitting across a 1200px row. Nothing
 * is clamped: the display name wraps, because DESIGN.md forbids clipping prose.
 */
export type ProfileHeaderProps = {
  account: AccountData;
  onEdit: () => void;
  onDetails: () => void;
};

export function ProfileHeader({
  account,
  onEdit,
  onDetails,
}: ProfileHeaderProps) {
  const { t } = useTranslation();

  return (
    <View
      className={cn(
        'flex-row items-start gap-4 py-4',
        // The web page wraps this block in one glass panel; the native list is
        // not inside that panel, so it keeps the platform inset itself.
        Platform.OS !== 'web' && 'px-4',
      )}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('account.details.open')}
        onPress={onDetails}
        className={cn(
          'rounded-full border-2 border-brass/40 p-1 active:opacity-70',
          FOCUS_RING,
        )}
      >
        <Avatar
          size="xl"
          src={account.photoURL}
          name={account.displayName}
          accessibilityLabel={t('account.a11y.profilePhoto')}
        />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('account.details.open')}
        onPress={onDetails}
        className={cn(
          'min-w-0 flex-1 items-start gap-1 rounded-chip active:opacity-80',
          FOCUS_RING,
          Platform.OS === 'web' && 'md:max-w-md',
        )}
      >
        <Text variant="subtitle">
          {account.displayName ?? t('account.profile.anonymous')}
        </Text>
        <Text variant="caption" tone="muted">
          {account.email ?? t('account.profile.noEmail')}
        </Text>
        <Badge
          variant="outline"
          label={t(roleLabelKey(account.role))}
          className="mt-1 self-start"
        />

        <View className="flex-row items-center gap-1 pt-1">
          <Text variant="caption" tone="muted">
            {t('account.details.open')}
          </Text>
          <Icon name="chevron-right" size={14} tone="muted" />
        </View>
      </Pressable>

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
