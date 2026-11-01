import { Host, List, ListItem, RNHostView } from '@expo/ui';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, useColorScheme, View } from 'react-native';
import { useDirection } from '@/i18n';
import { RequireAuth } from '@/features/auth/require-auth';
import { AccountSettingsWeb } from '@/features/account/account-settings-web';
import { ProfileHeader } from '@/features/account/profile-header';
import { PreferencesSection } from '@/features/settings/preferences-section';
import {
  useCurrentAccount,
  useSignOut,
} from '@/features/account/use-current-account';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Icon } from '@/ui/icon';
import { ListSectionHeader } from '@/ui/list-section-header';
import { Page } from '@/ui/page';
import { Screen, ScreenView } from '@/ui/screen';
import { Section } from '@/ui/section';
import { Loading, ErrorState, EmptyState } from '@/ui/states';
import { Text } from '@/ui/text';

/**
 * Account tab.
 *
 * Two surfaces in one screen:
 *
 *  - the **profile header** is RN (avatar, identity, edit button) hosted inside
 *    the list so it scrolls as one surface;
 *  - the **settings rows** are `@expo/ui` `List`/`ListItem` on iOS and Android,
 *    i.e. a real SwiftUI List / Compose LazyColumn with the platform's own
 *    pressed state, separators and accessibility;
 *  - on **web** those rows are the app's own `Pressable`/`Text`/`Icon`
 *    (`AccountSettingsWeb`). `@expo/ui`'s web fallback paints its labels with a
 *    hard-coded dark colour, which measured 1.23:1 on the dark background;
 *    rendering from tokens fixes that and lets the rows mirror in RTL. The web
 *    page is also capped at `max-w-3xl`, so a 1440 viewport gets a readable
 *    column instead of a 1400px row.
 *
 * The session comes from `AuthProvider`. This route is private: `RequireAuth`
 * (driven by the route registry's `access`) sends a signed-out visitor to the
 * sign-in modal and returns them here afterwards. The signed-out branch below
 * is therefore defensive, not the normal path â€” it still renders a real action
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
  const [signOutOpen, setSignOutOpen] = useState(false);

  const title = `${t('nav.account')} Â· ${t('app.name')}`;
  const chevron = isRTL ? 'chevron-left' : 'chevron-right';
  const openSignOut = () => setSignOutOpen(true);

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

      {Platform.OS === 'web' ? (
        <Screen contentContainerClassName="gap-0 p-0">
          <Page width="default" className="pb-10">
            <Section title={t('nav.account')} className="pt-6 pb-2" />

            <ProfileHeader
              account={state.data}
              onEdit={() => router.push('/account/edit')}
            />

            <ListSectionHeader
              label={t('account.sections.preferences')}
              inset={false}
            />
            <PreferencesSection />

            <AccountSettingsWeb
              isRTL={isRTL}
              onProgress={() => router.push('/account/progress')}
              onAbout={() => router.push('/about')}
              onSignOut={openSignOut}
            />
          </Page>
        </Screen>
      ) : (
        /*
          `colorScheme` keeps the native list chrome (separators, row labels,
          pressed states) in the app's scheme. It follows `Appearance`, which
          `ThemeProvider` keeps in sync with Uniwind, so a `system` theme
          resolves the same way here as it does in the Stylesheet.
        */
        <Host style={{ flex: 1 }} colorScheme={scheme ?? 'dark'}>
          <List testID="account-settings">
            <RNHostView matchContents={{ vertical: true }}>
              <View>
                <View className="px-4 pt-6 pb-2">
                  <Section title={t('nav.account')} />
                </View>
                <ProfileHeader
                  account={state.data}
                  onEdit={() => router.push('/account/edit')}
                />
              </View>
            </RNHostView>

            <ListSectionHeader label={t('account.sections.preferences')} />
            <RNHostView matchContents={{ vertical: true }}>
              <PreferencesSection />
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
              onPress={openSignOut}
            >
              {t('account.signOut.confirm')}
            </ListItem>
          </List>
        </Host>
      )}

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('account.signOut.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('account.signOut.message')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="h-11"
              onPress={() => setSignOutOpen(false)}
            >
              <Text>{t('account.signOut.cancel')}</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-11 bg-destructive"
              testID="account-sign-out-confirm"
              onPress={signOut}
            >
              <Text className="text-destructive-foreground">
                {t('account.signOut.confirm')}
              </Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScreenView>
  );
}
