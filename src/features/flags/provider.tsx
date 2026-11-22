import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { api, useApiQuery } from '@/api';
import { useSessionRole } from '@/features/auth/use-session-role';
import type { UserRole } from '@/core/types';
import type { TabName } from '@/features/navigation/route-registry';
import { featureForPath, TAB_FEATURES, type FeatureKey } from './registry';
import { buildSnapshot, featureView, type ResolvedFeature } from './resolve';
import {
  EMPTY_FEATURE_CONFIG,
  type FeatureConfig,
  type FeatureState,
  type FeatureView,
} from './types';

/**
 * One fetch of the switchboard, resolved for the viewer.
 *
 * The provider is the only place that knows the document is remote. Everything
 * else asks three questions — is it visible, is it blocked, may I write — and
 * gets an answer that already accounts for the dotted chain and for the
 * viewer's role.
 *
 * **Fail-open is a product decision, not an oversight.** While the document is
 * loading, or if the request fails, every feature is `on`. A kill switch that
 * takes the whole app down when its own endpoint is unreachable would be a
 * second outage triggered by the recovery tool. Writes are the exception: a
 * save that did not reach the server must reject (see `config.service.ts`).
 */

export type FeatureFlags = {
  /** `loading`/`error` are informational; gates still render (fail-open). */
  status: 'loading' | 'ready' | 'error';
  config: FeatureConfig;
  /** Every key, already resolved for the signed-in role. */
  resolved: Readonly<Record<FeatureKey, ResolvedFeature>>;
  state: (key: FeatureKey) => FeatureState;
  view: (key: FeatureKey) => FeatureView;
  /** The feature that owns a URL, or `null` for unregistered routes. */
  keyForPath: (pathname: string) => FeatureKey | null;
  /** Should the page render, or be replaced by the notice? */
  open: (pathname: string) => boolean;
  tabVisible: (tab: TabName) => boolean;
  retry: () => void;
};

function createFlags(
  config: FeatureConfig,
  role: ResolvedRole,
  status: FeatureFlags['status'],
  retry: () => void,
): FeatureFlags {
  const resolved = buildSnapshot(config, role).resolved;
  const view = (key: FeatureKey) => featureView(resolved[key].state);

  return {
    status,
    config,
    resolved,
    state: (key) => resolved[key].state,
    view,
    keyForPath: featureForPath,
    open: (pathname) => {
      if (view('app').blocked) return false;

      const key = featureForPath(pathname);

      return key === null ? true : !view(key).blocked;
    },
    tabVisible: (tab) => view(TAB_FEATURES[tab]).visible,
    retry,
  };
}

type ResolvedRole = UserRole | null;

const EMPTY_FLAGS = createFlags(EMPTY_FEATURE_CONFIG, null, 'ready', () => {});

const FeaturesContext = createContext<FeatureFlags>(EMPTY_FLAGS);

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const query = useApiQuery(api.config.features);
  const session = useSessionRole();

  /*
   * `data` is kept while a refetch is in flight and after a failed refetch, so a
   * blip never changes what the app shows. Only a first load has no data, and
   * that is the fail-open case.
   */
  const config = query.data ?? EMPTY_FEATURE_CONFIG;
  const status: FeatureFlags['status'] =
    query.isPending && !query.data
      ? 'loading'
      : query.isError && !query.data
        ? 'error'
        : 'ready';

  const retry = useCallback(() => {
    void query.refetch();
  }, [query]);

  const flags = useMemo(
    () => createFlags(config, session.role ?? null, status, retry),
    [config, session.role, status, retry],
  );

  return (
    <FeaturesContext.Provider value={flags}>
      {children}
    </FeaturesContext.Provider>
  );
}

/**
 * Reading the switchboard outside the provider yields "everything on".
 *
 * That keeps unit tests and isolated component renders honest without wrapping
 * every tree, and it matches the fail-open rule: no provider is indistinguishable
 * from a failed fetch.
 */
export function useFeatures(): FeatureFlags {
  return useContext(FeaturesContext);
}

/** One key, resolved. The common case for a capability gate. */
export function useFeature(key: FeatureKey): ResolvedFeature & FeatureView {
  const flags = useFeatures();
  const resolved = flags.resolved[key];

  return { ...resolved, ...featureView(resolved.state) };
}
