import { usePathname, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSessionRole } from '@/features/auth/use-session-role';
import { useAuth } from '@/providers/auth-context';
import { MOCK_BACKEND_ENABLED } from '@/api';
import { ScreenView } from '@/ui/screen';
import { EmptyState, ErrorState, Loading } from '@/ui/states';

/**
 * Administrative-surface gate.
 *
 * `RequireAuth` is the route gate; this is the role gate that administration
 * screens need on top of it. It is intentionally independent of
 * `AUTH_GATING_ENABLED`: the mock-backend session is real even while private
 * navigation is open for review, and a form must still refuse to render for a
 * visitor with no role.
 *
 * Four states, each a real screen rather than a blank:
 *  - restoring / profile loading — spinner, because "not an admin yet" and
 *    "not an admin" are indistinguishable to a user and one frame apart;
 *  - signed out — one action, sign in, returning to this path;
 *  - not an administrator — the reason plus the way back;
 *  - backend disabled — the surface cannot function, and says so plainly.
 */
export type RequireRoleProps = {
  children: ReactNode;
  /** `admin` (default) admits admins and superadmins. */
  minimum?: 'admin' | 'superadmin';
};

export function RequireRole({ children, minimum = 'admin' }: RequireRoleProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { account } = useAuth();
  const session = useSessionRole();

  if (!MOCK_BACKEND_ENABLED) {
    return (
      <ScreenView>
        <EmptyState
          title={t('admin.noBackend.title')}
          description={t('admin.noBackend.description')}
          actionLabel={t('action.back')}
          onAction={() => router.back()}
        />
      </ScreenView>
    );
  }

  if (session.state === 'restoring' || session.state === 'loading') {
    return (
      <ScreenView>
        <Loading label={t('action.loading')} />
      </ScreenView>
    );
  }

  if (session.state === 'signed-out') {
    return (
      <ScreenView>
        <EmptyState
          title={t('admin.signIn.title')}
          description={t('admin.signIn.description')}
          actionLabel={t('action.signIn')}
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

  if (account.state.status === 'error') {
    return (
      <ScreenView>
        <ErrorState
          title={t('state.errorTitle')}
          description={t('state.errorDescription')}
          onRetry={account.state.retry}
        />
      </ScreenView>
    );
  }

  const allowed =
    minimum === 'superadmin' ? session.isSuperadmin : session.isAdmin;

  if (!allowed) {
    return (
      <ScreenView>
        <EmptyState
          title={t('admin.forbidden.title')}
          description={t('admin.forbidden.description')}
          actionLabel={t('action.back')}
          onAction={() => router.back()}
        />
      </ScreenView>
    );
  }

  return children;
}
