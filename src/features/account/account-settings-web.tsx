import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import type { IconName } from '@/core/config';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { Icon } from '@/ui/icon';
import { ListSectionHeader } from '@/ui/list-section-header';
import { Text } from '@/ui/text';

/**
 * Account settings rows — web only.
 *
 * `@expo/ui`'s `List` is the right choice on iOS/Android: it is a real SwiftUI
 * List / Compose LazyColumn with the platform's separators and pressed states.
 * Its web fallback, however, paints its row labels with a hard-coded dark
 * colour, which on a dark background measured 1.23:1. Rather than theme a
 * third-party fallback we do not control, the web path renders the same rows
 * from the app's own primitives so every colour comes from a token.
 *
 * Grammar follows the rest of the app: hairlines, not boxes; a leading glyph,
 * a label with one quiet supporting line, and a directional chevron. Rows are
 * 56px tall, which also clears the 44px tap target. The row uses `flex-row`:
 * under `dir="rtl"` CSS already reverses the inline axis, so an additional
 * `flex-row-reverse` would put the leading glyph on the wrong side.
 */

type SettingsRowProps = {
  testID: string;
  icon: IconName;
  label: string;
  description?: string;
  onPress: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  /** The row closes a grouped surface: no trailing hairline. */
  last?: boolean;
};

function SettingsRow({
  testID,
  icon,
  label,
  description,
  onPress,
  destructive = false,
  showChevron = true,
  last = false,
}: SettingsRowProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'min-h-14 w-full flex-row items-center gap-3 py-3 active:opacity-70',
        !last && 'border-b border-glass-edge',
        FOCUS_RING,
      )}
    >
      <Icon name={icon} tone={destructive ? 'destructive' : 'muted'} />

      <View className="min-w-0 flex-1 items-start gap-0.5">
        <Text variant="label" tone={destructive ? 'destructive' : 'default'}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>

      {showChevron ? (
        <Icon name="chevron-right" size={18} tone="muted" />
      ) : null}
    </Pressable>
  );
}

export type AccountSettingsWebProps = {
  onProgress: () => void;
  onAbout: () => void;
  onFeedback: () => void;
  onSignOut: () => void;
  /** Administration only: the cohort's account list. */
  onMembers?: () => void;
  /** Real signed-in session only: self-service deletion is irreversible. */
  onDeleteAccount?: () => void;
};

export function AccountSettingsWeb({
  onProgress,
  onAbout,
  onFeedback,
  onSignOut,
  onMembers,
  onDeleteAccount,
}: AccountSettingsWebProps) {
  const { t } = useTranslation();

  return (
    <View>
      {onMembers ? (
        <>
          <ListSectionHeader
            label={t('account.sections.manage')}
            inset={false}
          />
          <SettingsRow
            testID="account-members-row"
            icon="users"
            label={t('account.admin.members')}
            description={t('account.admin.membersDescription')}
            onPress={onMembers}
            last
          />
        </>
      ) : null}

      <ListSectionHeader label={t('account.sections.settings')} inset={false} />

      <SettingsRow
        testID="account-progress-row"
        icon="chart-line"
        label={t('pages.account.progress.title')}
        description={t('pages.account.progress.subtitle')}
        onPress={onProgress}
      />

      <SettingsRow
        testID="account-about-row"
        icon="info"
        label={t('nav.about')}
        description={t('nav.aboutDesc')}
        onPress={onAbout}
      />

      <SettingsRow
        testID="account-feedback-row"
        icon="send"
        label={t('account.feedback.open')}
        description={t('account.feedback.rowDescription')}
        onPress={onFeedback}
      />

      <ListSectionHeader label={t('account.sections.session')} inset={false} />

      <SettingsRow
        testID="account-sign-out-row"
        icon="logout"
        label={t('account.signOut.confirm')}
        onPress={onSignOut}
        destructive
        showChevron={false}
        last={!onDeleteAccount}
      />

      {onDeleteAccount ? (
        <>
          <ListSectionHeader
            label={t('account.sections.danger')}
            inset={false}
          />
          <SettingsRow
            testID="account-delete-row"
            icon="trash"
            label={t('account.danger.delete')}
            description={t('account.danger.deleteDescription')}
            onPress={onDeleteAccount}
            destructive
            showChevron={false}
            last
          />
        </>
      ) : null}
    </View>
  );
}
