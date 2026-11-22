import { RequireRole } from '@/features/auth/require-role';
import { FeatureScreen } from '@/features/flags/gates';
import { MemberListScreen } from '@/features/account/member-list';

/**
 * `/admin/members` — the cohort's accounts.
 *
 * The gate lives at the route, not inside the list: a request to list accounts
 * is admin-only on the server, and a screen that mounts its query before the
 * gate would spend one guaranteed 403 on every visit.
 *
 * `FeatureScreen` is the second gate: administration is a write surface, so a
 * read-only `admin.members` shows the notice instead of a list whose every row
 * leads to a refused save.
 */
export default function MembersRoute() {
  return (
    <RequireRole>
      <FeatureScreen feature="admin.members">
        <MemberListScreen />
      </FeatureScreen>
    </RequireRole>
  );
}
