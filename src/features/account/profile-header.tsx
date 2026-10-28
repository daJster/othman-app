import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { AccountData } from '@/core/types';
import { Avatar } from '@/ui/avatar';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Text } from '@/ui/text';
import { roleLabelKey } from './role-label';

/**
 * Account header.
 *
 * Rendered inside the `@expo/ui` `List` as an `RNHostView`, so it scrolls with
 * the rows instead of floating above a second scroll surface. Everything here
 * is an ordinary RN component: the native list owns the rows, while the header
 * needs a layout SwiftUI/Compose would fight (avatar + two-line identity +
 * button).
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

  return (
    <View className="gap-3 p-4">
      <Card className="flex-row items-center gap-4">
        <Avatar
          size="xl"
          src={account.photoURL}
          name={account.displayName}
          accessibilityLabel={t('account.a11y.profilePhoto')}
        />

        <View className="flex-1 gap-1">
          <Text variant="subtitle" numberOfLines={1}>
            {account.displayName ?? t('account.profile.anonymous')}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {account.email ?? t('account.profile.noEmail')}
          </Text>
          <Badge
            variant="outline"
            label={t(roleLabelKey(account.role))}
            className="mt-1"
          />
        </View>

        <Button
          variant="outline"
          size="sm"
          label={t('action.edit')}
          accessibilityLabel={t('account.a11y.edit')}
          onPress={onEdit}
          testID="account-edit-button"
        />
      </Card>

      <Text variant="caption" tone="muted">
        {t('account.demoNote')}
      </Text>
    </View>
  );
}
