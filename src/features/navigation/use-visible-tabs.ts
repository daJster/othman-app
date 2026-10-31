import { useMemo } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { TABS } from './route-registry';
import { visibleTabs } from './visible-tabs';

/**
 * Tabs the current session may see.
 *
 * `TABS` is the single ordered list; this only removes private rows while
 * signed out. Filtering is derived from the registry rather than written by
 * hand in each shell, so the native tab bar and the web bar cannot disagree
 * about which destinations are gated.
 *
 * The predicate lives in `visible-tabs.ts` so it is testable without a
 * provider.
 */
export function useVisibleTabs() {
  const { user } = useAuth();

  return useMemo(() => visibleTabs(TABS, user !== null), [user]);
}

export { visibleTabs };
