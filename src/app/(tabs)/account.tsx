import { Host, List, ListItem, RNHostView } from '@expo/ui';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useTranslation } from 'react-i18next';
import { Alert, useColorScheme } from 'react-native';
import { useDirection } from '@/i18n';
import { RequireAuth } from '@/features/auth/require-auth';
import { ProfileHeader } from '@/features/account/profile-header';
import {
  useCurrentAccount,
  useSignOut,
} from '@/features/account/use-current-account';
import { Icon } from '@/ui/icon';
import { ListSectionHeader } from '@/ui/list-section-header';
import { Loading, ErrorState, EmptyState } from '@/ui/states';
import { ScreenView } from '@/ui/screen';

/**
 * Account tab.
 *
 * Two surfaces in one screen:
 *
 *  - the **profile header** is RN (avatar, identity, edit button) hosted inside
 *    the list so it scrolls as one surface;
 *  - the **settings rows** are `@expo/ui` `List`/`ListItem`, i.e. a real
 *    SwiftUI List / Compose LazyColumn on device and a plain list on web. Native
 *    rows bring the platform's own pressed state, separators and accessibility,
 *    which is exactly what a settings screen should look like.
 *
 * The session comes from `AuthProvider`. This route is private: `RequireAuth`
 * (driven by the route registry's `access`) sends a signed-out visitor to the
 * sign-in modal and returns them here afterwards. The signed-out branch below
 * is therefore defensive, not the normal path — it still renders a real action
 * instead of a dead end.
 */
export default function AccountScreen() {
  return (
    <RequireAuth>
      <AccountContent />
    </RequireAuth>
  );
}

function AccountContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isRTL } = useDirection();
  const scheme = useColorScheme();
  const { authUser, state } = useCurrentAccount();
  const signOut = useSignOut();

  const title = `${t('nav.account')} · ${t('app.name')}`;
  const chevron = isRTL ? 'chevron-left' : 'chevron-right';

  const confirmSignOut = () => {
    Alert.alert(t('account.signOut.title'), t('account.signOut.message'), [
      { text: t('account.signOut.cancel'), style: 'cancel' },
      {
        text: t('account.signOut.confirm'),
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  };

  if (!authUser) {
    return (
      <ScreenView>
        <Head>
          <title>{title}</title>
        </Head>
        <EmptyState
          title={t('account.signedOut.title')}
          description={t('account.signedOut.description')}
          actionLabel={t('account.signedOut.action')}
          onAction={() => router.push('/auth/sign-in')}
        />
      </ScreenView>
    );
  }

  if (state.status === 'pending') {
    return (
      <ScreenView>
        <Head>
          <title>{title}</title>
        </Head>
        <Loading label={t('action.loading')} />
      </ScreenView>
    );
  }

  if (state.status === 'error') {
    return (
      <ScreenView>
        <Head>
          <title>{title}</title>
        </Head>
        <ErrorState
          title={t('state.errorTitle')}
          description={t('state.errorDescription')}
          onRetry={state.retry}
        />
      </ScreenView>
    );
  }

  return (
    <ScreenView>
      <Head>
        <title>{title}</title>
      </Head>

      {/*
        `colorScheme` keeps the native list chrome (separators, row labels,
        pressed states) in the app's scheme. It follows `Appearance`, which
        `ThemeProvider` keeps in sync with Uniwind, so a `system` theme resolves
        the same way here as it does in the Stylesheet.
      */}
      <Host style={{ flex: 1 }} colorScheme={scheme ?? 'dark'}>
        <List testID="account-settings">
          <RNHostView matchContents={{ vertical: true }}>
            <ProfileHeader
              account={state.data}
              onEdit={() => router.push('/account/edit')}
            />
          </RNHostView>

          <ListSectionHeader label={t('account.sections.settings')} />

          <ListItem
            testID="account-progress-row"
            leading={<Icon name="chart-line" />}
            trailing={<Icon name={chevron} tone="muted" />}
            supportingText={t('pages.account.progress.subtitle')}
            onPress={() => router.push('/account/progress')}
          >
            {t('pages.account.progress.title')}
          </ListItem>

          <ListItem
            testID="account-about-row"
            leading={<Icon name="info" />}
            trailing={<Icon name={chevron} tone="muted" />}
            supportingText={t('nav.aboutDesc')}
            onPress={() => router.push('/about')}
          >
            {t('nav.about')}
          </ListItem>

          <ListSectionHeader label={t('account.sections.session')} />

          <ListItem
            testID="account-sign-out-row"
            leading={<Icon name="logout" tone="destructive" />}
            onPress={confirmSignOut}
          >
            {t('account.signOut.confirm')}
          </ListItem>
        </List>
      </Host>
    </ScreenView>
  );
}
