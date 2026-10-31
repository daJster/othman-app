import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EditProfileForm } from '@/features/account/edit-profile-form';
import { useCurrentAccount } from '@/features/account/use-current-account';
import { RequireAuth } from '@/features/auth/require-auth';
import { EmptyState, ErrorState, Loading } from '@/ui/states';
import { ScreenView } from '@/ui/screen';
// Expo Router 57 does not re-export this hook yet (it becomes public in SDK 58),
// but the native stack already ships the implementation. The deep import keeps
// a save in progress from being orphaned by a swipe-down or the Android back
// button. Replace it with the barrel import when the SDK exposes it.
import { usePreventRemove } from 'expo-router/build/react-navigation/core/usePreventRemove';

/**
 * Edit profile — presented as a `formSheet` by the root layout.
 *
 * The sheet is the right presentation on both platforms: iOS gets a real
 * card-style sheet with a grabber, Android a modal that respects the back
 * gesture. Cancel discards because the form owns its draft; nothing is written
 * until Save succeeds.
 *
 * `usePreventRemove` is armed only while a write is in flight. Blocking every
 * dismissal would trap a user who simply changed their mind, which is what
 * Cancel (and the swipe, when idle) is for.
 */
export default function EditAccountScreen() {
  return (
    <RequireAuth>
      <EditAccountContent />
    </RequireAuth>
  );
}

function EditAccountContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const { authUser, state } = useCurrentAccount();
  const [pending, setPending] = useState(false);

  usePreventRemove(pending, () => {
    // Intentionally quiet: the sheet snapping back is the feedback.
  });

  const handlePendingChange = useCallback((next: boolean) => {
    setPending(next);
  }, []);

  const leave = useCallback(() => {
    router.back();
  }, [router]);

  const title = `${t('account.edit.title')} · ${t('app.name')}`;

  if (!authUser) {
    return (
      <ScreenView>
        <Head>
          <title>{title}</title>
        </Head>
        <EmptyState
          title={t('account.signedOut.title')}
          description={t('account.signedOut.description')}
          actionLabel={t('action.back')}
          onAction={leave}
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
      <EditProfileForm
        account={state.data}
        onPendingChange={handlePendingChange}
        onSaved={leave}
        onCancel={leave}
      />
    </ScreenView>
  );
}
