import { Host, List, ListItem, RNHostView } from '@expo/ui';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, useColorScheme, View } from 'react-native';
import { RequireAuth } from '@/features/auth/require-auth';
import { AccountDetailsDrawer } from '@/features/account/account-details-drawer';
import { AccountSettingsWeb } from '@/features/account/account-settings-web';
import { AccountSkeleton } from '@/features/account/account-skeleton';
import { FeedbackDialog } from '@/features/account/feedback-dialog';
import { LearningSnapshot } from '@/features/account/learning-snapshot';
import { ProfileCompleteness } from '@/features/account/profile-completeness';
import { ProfileHeader } from '@/features/account/profile-header';
import { PreferencesSection } from '@/features/settings/preferences-section';
import {
  useCurrentAccount,
  useSignOut,
} from '@/features/account/use-current-account';
import { api, backendMessageKey, useApiMutation } from '@/api';
import { useSessionRole } from '@/features/auth/use-session-role';
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
 * Three layers on one reading surface:
 *
 *  - the **profile header** (avatar, identity, edit) is the anchor;
 *  - **profile completeness** and the **learning snapshot** turn the header
 *    into an account that says something, instead of four rows and empty
 *    space;
 *  - the **settings rows** are `@expo/ui` `List`/`ListItem` on iOS and Android
 *    (a real SwiftUI List / Compose LazyColumn with the platform's own pressed
 *    state, separators and accessibility) and the app's own rows on web.
 *
 * The web rows exist because `@expo/ui`'s web fallback paints its labels with a
 * hard-coded dark colour, which measured 1.23:1 on the dark background. The
 * web page is also capped at `max-w-3xl`.
 *
 * Two overlays finish the page without lengthening it: the profile drawer
 * (details, not a second form) and the feedback dialog (one focused task). The
 * drawer repeats the avatar because it can open from either the photo or the
 * identity column, and a generic settings panel would lose the person.
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
  const scheme = useColorScheme();
  const { authUser, state } = useCurrentAccount();
  const signOut = useSignOut();
  const session = useSessionRole();
  const deleteAccount = useApiMutation(api.demo.accounts.deleteMe);
  const toast = useToast();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const title = `${t('nav.account')} · ${t('app.name')}`;
  const openEdit = () => router.push('/account/edit');
  const openSignOut = () => setSignOutOpen(true);
  const openProgress = () => router.push('/account/progress');
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
             * completeness, their numbers and their settings are one subject;
             * grouping them inside a single glass surface is the iOS
             * grouped-list grammar, and it stops a five-panel stack from
             * stacking five light materials on top of each other.
             */}
            <GlassPanel radius="card" weight="panel" className="px-gutter">
              <ProfileHeader
                account={state.data}
                onEdit={openEdit}
                onDetails={() => setDetailsOpen(true)}
              />

              <ProfileCompleteness account={state.data} onEdit={openEdit} />

              <LearningSnapshot onViewProgress={openProgress} />

              <ListSectionHeader
                label={t('account.sections.preferences')}
                inset={false}
              />
              <PreferencesSection />

              <ListSectionHeader
                label={t('account.sections.settings')}
                inset={false}
              />
              <AccountSettingsWeb
                onProgress={openProgress}
                onAbout={openAbout}
                onFeedback={() => setFeedbackOpen(true)}
                onSignOut={openSignOut}
                onMembers={session.isAdmin ? openMembers : undefined}
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
                <View className="px-4 pt-6 pb-2">
                  <Section title={t('nav.account')} level={1} />
                </View>

                <ProfileHeader
                  account={state.data}
                  onEdit={openEdit}
                  onDetails={() => setDetailsOpen(true)}
                />

                <ProfileCompleteness account={state.data} onEdit={openEdit} />

                <LearningSnapshot onViewProgress={openProgress} />
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
              trailing={<Icon name="chevron-right" tone="muted" />}
              supportingText={t('pages.account.progress.subtitle')}
              onPress={openProgress}
            >
              {t('pages.account.progress.title')}
            </ListItem>

            <ListItem
              testID="account-about-row"
              leading={<Icon name="info" />}
              trailing={<Icon name="chevron-right" tone="muted" />}
              supportingText={t('nav.aboutDesc')}
              onPress={openAbout}
            >
              {t('nav.about')}
            </ListItem>

            <ListItem
              testID="account-feedback-row"
              leading={<Icon name="send" />}
              trailing={<Icon name="chevron-right" tone="muted" />}
              supportingText={t('account.feedback.rowDescription')}
              onPress={() => setFeedbackOpen(true)}
            >
              {t('account.feedback.open')}
            </ListItem>

            {session.isAdmin ? (
              <>
                <ListSectionHeader label={t('account.sections.manage')} />
                <ListItem
                  testID="account-members-row"
                  leading={<Icon name="users" />}
                  trailing={<Icon name="chevron-right" tone="muted" />}
                  supportingText={t('account.admin.membersDescription')}
                  onPress={openMembers}
                >
                  {t('account.admin.members')}
                </ListItem>
              </>
            ) : null}

            <ListSectionHeader label={t('account.sections.session')} />

            <ListItem
              testID="account-sign-out-row"
              leading={<Icon name="logout" tone="destructive" />}
              onPress={openSignOut}
            >
              {t('account.signOut.confirm')}
            </ListItem>

            {session.canWrite ? (
              <>
                <ListSectionHeader label={t('account.sections.danger')} />
                <ListItem
                  testID="account-delete-row"
                  leading={<Icon name="trash" tone="destructive" />}
                  onPress={() => setDeleteOpen(true)}
                >
                  {t('account.danger.delete')}
                </ListItem>
              </>
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
