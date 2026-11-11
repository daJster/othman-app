import { useLocalSearchParams } from 'expo-router';
import { RequireRole } from '@/features/auth/require-role';
import { MemberFormScreen } from '@/features/account/member-form-screen';

/**
 * `/admin/members/edit` and `/admin/members/edit?uid=…`.
 *
 * One form sheet for create and edit, like the meeting form. An empty `uid`
 * means "create"; the route never guesses an account to edit.
 */
export default function MemberEditRoute() {
  const { uid } = useLocalSearchParams<{ uid?: string }>();
  const memberUid =
    typeof uid === 'string' && uid.trim().length > 0 ? uid : null;

  return (
    <RequireRole>
      <MemberFormScreen uid={memberUid} />
    </RequireRole>
  );
}
