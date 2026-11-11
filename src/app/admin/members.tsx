import { RequireRole } from '@/features/auth/require-role';
import { MemberListScreen } from '@/features/account/member-list';

/**
 * `/admin/members` — the cohort's accounts.
 *
 * The gate lives at the route, not inside the list: a request to list accounts
 * is admin-only on the server, and a screen that mounts its query before the
 * gate would spend one guaranteed 403 on every visit.
 */
export default function MembersRoute() {
  return (
    <RequireRole>
      <MemberListScreen />
    </RequireRole>
  );
}
