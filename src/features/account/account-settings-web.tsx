import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { ListSectionHeader } from '@/ui/list-section-header';
import { SettingsRow } from './settings-row';

/**
 * Account settings rows — web only.
 *
 * `@expo/ui`'s `List` is the right choice on iOS/Android, but its web fallback
 * paints row labels with a hard-coded dark colour that measured 1.23:1 on the
 * dark ground. The web path renders the same rows from the app's own primitives
 * instead, so every colour comes from a token.
 *
 * Two groups only: the things that are not preferences and not the person —
 * About and feedback — and the way out. The session rows share one header: the
 * destructive row is marked by its icon and colour, not by a second "Account"
 * heading that repeats the page title.
 */
export type AccountSettingsWebProps = {
  onAbout: () => void;
  onFeedback: () => void;
  onSignOut: () => void;
  /** Administration only: the cohort's account list. */
  onMembers?: () => void;
  /** Superadmin only: the remote feature switchboard. */
  onFeatures?: () => void;
  /** Development only: opens the seeded-account switcher. */
  onSwitchAccount?: () => void;
  /** Real signed-in session only: self-service deletion is irreversible. */
  onDeleteAccount?: () => void;
};

export function AccountSettingsWeb({
  onAbout,
  onFeedback,
  onSignOut,
  onMembers,
  onFeatures,
  onSwitchAccount,
  onDeleteAccount,
}: AccountSettingsWebProps) {
  const { t } = useTranslation();

  return (
    <View>
      <ListSectionHeader label={t('account.sections.more')} inset={false} />

      <SettingsRow
        testID="account-about-row"
        icon="info"
        label={t('nav.about')}
        onPress={onAbout}
      />

      <SettingsRow
        testID="account-feedback-row"
        icon="send"
        label={t('account.feedback.open')}
        onPress={onFeedback}
        last={!onMembers && !onFeatures}
      />

      {onMembers || onFeatures ? (
        <>
          <ListSectionHeader
            label={t('account.sections.manage')}
            inset={false}
          />
          {onMembers ? (
            <SettingsRow
              testID="account-members-row"
              icon="users"
              label={t('account.admin.members')}
              onPress={onMembers}
              last={!onFeatures}
            />
          ) : null}
          {onFeatures ? (
            <SettingsRow
              testID="account-features-row"
              icon="layers"
              label={t('account.admin.features')}
              onPress={onFeatures}
              last
            />
          ) : null}
        </>
      ) : null}

      <ListSectionHeader label={t('account.sections.session')} inset={false} />

      {onSwitchAccount ? (
        <SettingsRow
          testID="account-switch-row"
          icon="users"
          label={t('auth.dev.switchAccount')}
          onPress={onSwitchAccount}
        />
      ) : null}

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
        <SettingsRow
          testID="account-delete-row"
          icon="trash"
          label={t('account.danger.delete')}
          onPress={onDeleteAccount}
          destructive
          showChevron={false}
          last
        />
      ) : null}
    </View>
  );
}
