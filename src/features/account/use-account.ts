import { api, useApiMutation, useApiQuery } from '@/api';
import type { AccountData, AuthUser } from '@/core/types';
import {
  toAsyncResult,
  type AsyncPresentResult,
} from '@/features/query/async-state';

/**
 * The signed-in account: auth merged with the profile row.
 *
 * Takes the auth user as an argument rather than reading a context: the
 * provider itself calls this hook, so reaching for that provider's context
 * would be a cycle. Passing the user also keeps the hook testable without an
 * `AuthProvider`.
 *
 * `null` means "not signed in", which is a *disabled* query, not an error. The
 * endpoint's `ready` guard expresses that, and the key falls back to a
 * placeholder uid — a disabled query never writes, so the placeholder cannot be
 * observed in the cache.
 */
export function useAccount(
  authUser: AuthUser | null,
): AsyncPresentResult<AccountData> {
  const query = useApiQuery(api.account.byUid, { user: authUser });

  // No `isEmpty`: an account always has at least a uid. A disabled query is
  // already `pending`, so the signed-out result needs no special case here.
  return toAsyncResult(query);
}

/**
 * Profile write.
 *
 * The command needs both the uid and the patch, so both travel as variables —
 * the uid is not captured by the hook, which keeps one mutation instance valid
 * for whichever account the screen is showing.
 *
 * Invalidation (the account key for that uid) is declared on
 * `api.account.update`, not here. No optimistic update: a name that flips back
 * after a failed write is worse than a spinner.
 */
export function useUpdateAccount() {
  return useApiMutation(api.account.update);
}
