import { requiresAuth, type TabRoute } from './route-registry';

/**
 * Tabs a session may see.
 *
 * Kept free of React (and of the auth provider) so the policy can be tested
 * without booting a session or Firebase. The hook in `use-visible-tabs.ts` is
 * the only consumer that knows about auth.
 */
export function visibleTabs(
  tabs: readonly TabRoute[],
  isSignedIn: boolean,
): readonly TabRoute[] {
  if (isSignedIn) return tabs;

  return tabs.filter((tab) => !requiresAuth(tab.href));
}
