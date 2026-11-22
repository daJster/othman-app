import { Host, List, ListItem, RNHostView } from '@expo/ui';
import { usePathname, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, useColorScheme, View } from 'react-native';
import { RequireAuth } from '@/features/auth/require-auth';
import {
  DEV_SWITCHER_ENABLED,
  DevAccountDialog,
} from '@/features/auth/dev-accounts';
import { AccountDetailsDrawer } from '@/features/account/account-details-drawer';
import { AccountSettingsWeb } from '@/features/account/account-settings-web';
import { AccountSkeleton } from '@/features/account/account-skeleton';
import { FeedbackDialog } from '@/features/account/feedback-dialog';
import { NoticesSheet } from '@/features/home/notices-sheet';
import { ProfileHeader } from '@/features/account/profile-header';
import { PreferencesSection } from '@/features/settings/preferences-section';
import {
  AppearanceSheet,
  LanguageSheet,
} from '@/features/settings/preferences-sheets';
import {
  useCurrentAccount,
  useSignOut,
} from '@/features/account/use-current-account';
import { api, backendMessageKey, useApiMutation } from '@/api';
import { useSessionRole } from '@/features/auth/use-session-role';
import { useFeatures } from '@/features/flags/provider';
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
import { GlassPanel } from '@/ui/glass';
import { ListSectionHeader } from '@/ui/list-section-header';
import { Page } from '@/ui/page';
import { Screen, ScreenView } from '@/ui/screen';
import { Section } from '@/ui/section';
import { EmptyState, ErrorState } from '@/ui/states';
import { Text } from '@/ui/text';
import { useToast } from '@/ui/panel';

/**
 * Account tab.
 *
 * One reading surface:
 *
 *  - the **profile header** (avatar, identity, edit) is the anchor;
 *  - the rows below it are the account: preferences, the rest, and the way
 *    out. Progress is not duplicated here; it keeps its own screen.
 *
 * The **settings rows** are `@expo/ui` `List`/`ListItem` on iOS and Android
 * (a real SwiftUI List / Compose LazyColumn with the platform's own pressed
 * state, separators and accessibility) and the app's own rows on web.
 *
 * Preferences are two rows that name their current value and open a sheet.
 * Everything else is one "More" group, and the way out is one "Session" group:
 * no section repeats the page title, and no action appears twice.
 *
 * The web rows exist because `@expo/ui`'s web fallback paints its labels with a
 * hard-coded dark colour, which measured 1.23:1 on the dark background. The
 * web page is also capped at `max-w-3xl`.
 *
 * Three overlays finish the page without lengthening it: the profile drawer
 * (details plus completeness), the preference sheets and the feedback dialog.
 * The drawer repeats the avatar because it can open from either the photo or
 * the identity column, and a generic settings panel would lose the person.
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
  const pathname = usePathname();
  const scheme = useColorScheme();
  const { authUser, state } = useCurrentAccount();
  const signOut = useSignOut();
  const session = useSessionRole();
  const flags = useFeatures();
  const deleteAccount = useApiMutation(api.demo.accounts.deleteMe);
  const toast = useToast();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [switchAccountOpen, setSwitchAccountOpen] = useState(false);

  const title = `${t('nav.account')} · ${t('app.name')}`;
  const openEdit = () => router.push('/account/edit');
  const openSignOut = () => setSignOutOpen(true);
  const openAbout = () => router.push('/about');
  const openMembers = () => router.push('/admin/members');

  const confirmDelete = () => {
    // Self-deletion goes through `/v1/auth/account`, not the admin remove: the
    // admin route explicitly refuses to delete the caller. `NoParams` means
    // the mutation takes no variables.
    deleteAccount.mutate(undefined, {
      onSuccess: async () => {
        setDeleteOpen(false);
        await signOut();
        toast.show(t('account.danger.deleted'), { tone: 'success' });
      },
      onError: (error) => {
        setDeleteOpen(false);
        toast.show(t(backendMessageKey(error)), { tone: 'error' });
      },
    });
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
          onAction={() =>
            router.push({
              pathname: '/auth/sign-in',
              params: { returnTo: pathname },
            })
          }
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
        <AccountSkeleton />
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
            <Section title={t('nav.account')} level={1} className="pt-6 pb-2" />

            {/*
             * One material sheet, not five cards. The person, their
             * preferences and the rest are one subject; grouping them inside a
             * single glass surface is the iOS grouped-list grammar, and it
             * stops a stack of separate panels from stacking separate light
             * materials on top of each other.
             */}
            <GlassPanel radius="card" weight="panel" className="px-gutter">
              <ProfileHeader
                account={state.data}
                onEdit={
                  flags.view('account.edit').writable ? openEdit : undefined
                }
                onDetails={() => setDetailsOpen(true)}
              />

              <ListSectionHeader
                label={t('account.sections.preferences')}
                inset={false}
              />
              <PreferencesSection
                onAppearance={() => setAppearanceOpen(true)}
                onLanguage={() => setLanguageOpen(true)}
              />

              <AccountSettingsWeb
                onAbout={openAbout}
                onFeedback={() => setFeedbackOpen(true)}
                onSignOut={openSignOut}
                onMembers={
                  session.isAdmin && flags.view('admin.members').visible
                    ? openMembers
                    : undefined
                }
                onFeatures={
                  session.isSuperadmin
                    ? () => router.push('/admin/features')
                    : undefined
                }
                onSwitchAccount={
                  DEV_SWITCHER_ENABLED && authUser
                    ? () => setSwitchAccountOpen(true)
                    : undefined
                }
                onDeleteAccount={
                  session.canWrite ? () => setDeleteOpen(true) : undefined
                }
              />
            </GlassPanel>
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
                <View className="px-4 pt-4 pb-1">
                  <Section title={t('nav.account')} level={1} />
                </View>

                <ProfileHeader
                  account={state.data}
                  onEdit={
                    flags.view('account.edit').writable ? openEdit : undefined
                  }
                  onDetails={() => setDetailsOpen(true)}
                />
              </View>
            </RNHostView>

            <ListSectionHeader label={t('account.sections.preferences')} />
            <PreferencesSection
              onAppearance={() => setAppearanceOpen(true)}
              onLanguage={() => setLanguageOpen(true)}
            />

            <ListSectionHeader label={t('account.sections.more')} />

            <ListItem
              testID="account-notifications-row"
              leading={<Icon name="bell" />}
              trailing={<Icon name="chevron-right" tone="muted" />}
              onPress={() => setNotificationsOpen(true)}
            >
              {t('home.notices.open')}
            </ListItem>

            <ListItem
              testID="account-about-row"
              leading={<Icon name="info" />}
              trailing={<Icon name="chevron-right" tone="muted" />}
              onPress={openAbout}
            >
              {t('nav.about')}
            </ListItem>

            <ListItem
              testID="account-feedback-row"
              leading={<Icon name="send" />}
              trailing={<Icon name="chevron-right" tone="muted" />}
              onPress={() => setFeedbackOpen(true)}
            >
              {t('account.feedback.open')}
            </ListItem>

            {session.isAdmin || session.isSuperadmin ? (
              <>
                <ListSectionHeader label={t('account.sections.manage')} />
                {session.isAdmin && flags.view('admin.members').visible ? (
                  <ListItem
                    testID="account-members-row"
                    leading={<Icon name="users" />}
                    trailing={<Icon name="chevron-right" tone="muted" />}
                    onPress={openMembers}
                  >
                    {t('account.admin.members')}
                  </ListItem>
                ) : null}
                {session.isSuperadmin ? (
                  <ListItem
                    testID="account-features-row"
                    leading={<Icon name="layers" />}
                    trailing={<Icon name="chevron-right" tone="muted" />}
                    onPress={() => router.push('/admin/features')}
                  >
                    {t('account.admin.features')}
                  </ListItem>
                ) : null}
              </>
            ) : null}

            {/*
              One session group. The old page put "Delete my account" under a
              second header reading "Account", directly under the page title and
              the tab label; the destructive row is marked by its icon and the
              confirmation dialog, not by repeating the page name.
            */}
            <ListSectionHeader label={t('account.sections.session')} />

            {DEV_SWITCHER_ENABLED && authUser ? (
              <ListItem
                testID="account-switch-row"
                leading={<Icon name="users" />}
                trailing={<Icon name="chevron-right" tone="muted" />}
                onPress={() => setSwitchAccountOpen(true)}
              >
                {t('auth.dev.switchAccount')}
              </ListItem>
            ) : null}

            <ListItem
              testID="account-sign-out-row"
              leading={<Icon name="logout" tone="destructive" />}
              onPress={openSignOut}
            >
              {t('account.signOut.confirm')}
            </ListItem>

            {session.canWrite ? (
              <ListItem
                testID="account-delete-row"
                leading={<Icon name="trash" tone="destructive" />}
                onPress={() => setDeleteOpen(true)}
              >
                {t('account.danger.delete')}
              </ListItem>
            ) : null}
          </List>
        </Host>
      )}

      <AccountDetailsDrawer
        account={state.data}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onEdit={() => {
          setDetailsOpen(false);
          openEdit();
        }}
      />

      <FeedbackDialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />

      {Platform.OS !== 'web' ? (
        <NoticesSheet
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
        />
      ) : null}

      {/*
        Mounted only while open: the choosers read the theme and language
        providers, and a closed sheet has no reason to render either. The
        native sheet dismisses before `onClose` unmounts it.
      */}
      {appearanceOpen ? (
        <AppearanceSheet onClose={() => setAppearanceOpen(false)} />
      ) : null}

      {languageOpen ? (
        <LanguageSheet onClose={() => setLanguageOpen(false)} />
      ) : null}

      {DEV_SWITCHER_ENABLED ? (
        <DevAccountDialog
          open={switchAccountOpen}
          onClose={() => setSwitchAccountOpen(false)}
        />
      ) : null}

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
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('account.danger.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('account.danger.message')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="h-11"
              onPress={() => setDeleteOpen(false)}
            >
              <Text>{t('action.cancel')}</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-11 bg-destructive"
              disabled={deleteAccount.isPending}
              testID="account-delete-confirm"
              onPress={confirmDelete}
            >
              <Text className="text-destructive-foreground">
                {t('account.danger.confirm')}
              </Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScreenView>
  );
}
