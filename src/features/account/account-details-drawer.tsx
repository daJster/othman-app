import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { AccountData } from '@/core/types';
import { Avatar } from '@/ui/avatar';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Drawer } from '@/ui/panel';
import { Text } from '@/ui/text';
import { roleLabelKey } from './role-label';

/**
 * The full profile, in the drawer.
 *
 * The header shows what fits on one line — name, email, role. The drawer is
 * where the rest lives: the phone number, the fact that an email is verified,
 * and the account identifier. It is reference material, so the only action is
 * Edit, and it sits in the footer where a thumb expects it.
 *
 * The avatar is repeated rather than moved: a drawer can open from anywhere in
 * the account screen, and a panel with no identity would read as generic
 * settings.
 */
export type AccountDetailsDrawerProps = {
  account: AccountData;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
};

export function AccountDetailsDrawer({
  account,
  open,
  onClose,
  onEdit,
}: AccountDetailsDrawerProps) {
  const { t } = useTranslation();

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t('account.details.title')}
      testID="account-details-drawer"
      closeTestID="account-details-close"
      footer={
        <Button
          variant="outline"
          label={t('account.details.edit')}
          onPress={onEdit}
          testID="account-details-edit"
        />
      }
    >
      <View className="items-center gap-2 pb-2">
        <View className="rounded-full border-2 border-brass/40 p-1">
          <Avatar
            size="xl"
            src={account.photoURL}
            name={account.displayName}
            accessibilityLabel={t('account.a11y.profilePhoto')}
          />
        </View>
        <Text variant="subtitle" align="center">
          {account.displayName ?? t('account.profile.anonymous')}
        </Text>
        <Badge
          variant="outline"
          label={t(roleLabelKey(account.role))}
          className="self-center"
        />
      </View>

      <View className="gap-4 border-t border-border pt-4">
        <DetailRow
          label={t('account.details.email')}
          value={account.email ?? t('account.profile.noEmail')}
          icon="file-text"
        />
        <DetailRow
          label={t('account.details.phone')}
          value={account.phoneNumber ?? t('account.details.noPhone')}
          icon="info"
        />
        <DetailRow
          label={t('account.details.role')}
          value={t(roleLabelKey(account.role))}
          icon="user"
        />
      </View>

      <View className="flex-row items-start gap-2 rounded-lg border border-border bg-muted/40 p-3">
        <Icon name="info" size={16} tone="muted" />
        <Text variant="caption" tone="muted" className="flex-1">
          {t('account.details.note')}
        </Text>
      </View>
    </Drawer>
  );
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: 'file-text' | 'info' | 'user';
}) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-muted">
        <Icon name={icon} size={16} tone="muted" />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text variant="overline" tone="muted">
          {label}
        </Text>
        <Text variant="body" selectable>
          {value}
        </Text>
      </View>
    </View>
  );
}
