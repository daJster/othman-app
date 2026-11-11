import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { MOCK_BACKEND_ENABLED } from '@/platform/backend';
import { useOptionalAuth } from '@/providers/auth-context';
import { FETCH_POLICIES } from './policies';
import type { ApiMutation, ApiQuery } from './types';

/**
 * The two hooks every screen uses.
 *
 * They are thin on purpose. TanStack already owns loading, retries, dedupe and
 * suspense; what is missing without them is *policy*: which strategy applies,
 * whether the question is ready to be asked, and what a write makes stale. All
 * three are properties of the command (see `endpoints.ts`), so a screen that
 * calls `useApiQuery` cannot forget them.
 *
 * Everything else stays where TanStack put it. `select`, `placeholderData`,
 * `onMutate` and friends are plain call-site options, not a second config
 * language layered on top.
 */

export type ApiQueryOptions<R> = Omit<
  Partial<UseQueryOptions<R, Error, R, QueryKey>>,
  'queryKey' | 'queryFn'
>;

/**
 * Arity that follows the endpoint.
 *
 * A parameterless command is called `useApiQuery(api.quran.catalog)`, a
 * parameterised one `useApiQuery(api.meetings.byDate, { date })`. Making that a
 * conditional tuple keeps both ergonomic without allowing the mistake that
 * matters — calling a parameterised command with no parameters.
 */
type QueryArgs<P, R> = [P] extends [void]
  ? [options?: ApiQueryOptions<R>]
  : [params: P, options?: ApiQueryOptions<R>];

export function useApiQuery<P, R>(
  endpoint: ApiQuery<P, R>,
  ...args: QueryArgs<P, R>
): UseQueryResult<R, Error> {
  /*
   * The rest tuple cannot tell a parameterless call's `[options]` from a
   * parameterised call's `[params]`: both arrive as one argument. The key
   * function is the reliable discriminator — `key: () => …` has arity 0,
   * while every parameterised key declares a parameter, including the
   * destructured `({ user }) => …` form. Without this, `ready` and `key`
   * received `undefined` for every parameterised query and the server render
   * crashed.
   */
  const takesParams = endpoint.key.length > 0;
  const [params, options] = takesParams
    ? [args[0] as P, args[1] as ApiQueryOptions<R> | undefined]
    : [undefined as P, args[0] as ApiQueryOptions<R> | undefined];

  const policy = FETCH_POLICIES[endpoint.policy];
  const ready = endpoint.ready?.(params) ?? true;
  // Demo endpoints are the server's own surface: they answer only when the
  // local server is running *and* there is a session to act as. A signed-out
  // app asks nothing and shows nothing, instead of collecting 401s.
  const session = useOptionalAuth();
  const demoReady =
    endpoint.demo !== true || (MOCK_BACKEND_ENABLED && session?.user != null);

  return useQuery<R, Error, R, QueryKey>({
    ...policy,
    ...options,
    queryKey: endpoint.key(params),
    queryFn: () => endpoint.run(params),
    // A disabled query is still a valid cache key: it simply never writes.
    enabled: (options?.enabled ?? true) && ready && demoReady,
  });
}

export type ApiMutationOptions<P, R, C = unknown> = Omit<
  UseMutationOptions<R, Error, P, C>,
  'mutationFn'
>;

/**
 * A write, with the endpoint's invalidation applied automatically.
 *
 * The caller still owns optimistic updates and error copy — those are screen
 * decisions. What it does not own is remembering to invalidate the right keys,
 * which is why that rule lives in `endpoints.ts` and nowhere else.
 */
export function useApiMutation<P, R, C = unknown>(
  endpoint: ApiMutation<P, R>,
  options?: ApiMutationOptions<P, R, C>,
): UseMutationResult<R, Error, P, C> {
  const client = useQueryClient();

  const invalidate = useCallback(
    (variables: P) => {
      for (const key of endpoint.invalidates?.(variables) ?? []) {
        void client.invalidateQueries({ queryKey: key });
      }
    },
    [client, endpoint],
  );

  return useMutation<R, Error, P, C>({
    ...options,
    mutationFn: (variables: P) => endpoint.run(variables),
    onSuccess: (data, variables, onMutateResult, context) => {
      invalidate(variables);

      return options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}
