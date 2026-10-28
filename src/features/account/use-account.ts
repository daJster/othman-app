import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AccountProfile } from '@/core/domain/account/merge-profile';
import type { AccountData, AuthUser } from '@/core/types';
import { toAsyncResult, type AsyncResult } from '@/features/query/async-state';
import { profileService } from '@/services/profile';
import { queryKeys } from '@/services/query';

/**
 * The signed-in account: Firebase Auth merged with the Firestore profile.
 *
 * Takes the auth user as an argument rather than reading a context: `AuthProvider`
 * arrives in P3.3, and a hook that reaches for a provider it cannot see would
 * have to be rewritten then. Passing the user keeps this layer auth-ready and
 * trivially testable.
 *
 * `null` means "not signed in", which is a *disabled* query, not an error. The
 * key uses a placeholder segment in that state: TanStack requires a key even
 * when a query is disabled, and a disabled query never writes to the cache, so
 * the placeholder cannot be observed.
 */
const ANONYMOUS = 'anonymous';

export function useAccount(
  authUser: AuthUser | null,
): AsyncResult<AccountData> {
  const query = useQuery({
    queryKey: queryKeys.account.byUid(authUser?.uid ?? ANONYMOUS),
    queryFn: () => profileService.getAccount(authUser as AuthUser),
    enabled: authUser !== null,
  });

  // No `isEmpty`: an account always has at least a uid. A disabled query is
  // already `pending`, so the signed-out result needs no special case here.
  return toAsyncResult(query);
}

/**
 * Profile write.
 *
 * Invalidates the account key on success instead of writing the response into
 * the cache: `update` is a partial write and the server merges it with fields
 * this call does not know about, so the only correct next read is a refetch.
 * No optimistic update — a name that flips back after a failed write is worse
 * than a spinner.
 */
export function useUpdateAccount(uid: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (patch: Partial<AccountProfile>) =>
      profileService.update(uid, patch),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: queryKeys.account.byUid(uid) }),
  });
}
