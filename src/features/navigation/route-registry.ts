import type { IconName } from '@/core/config';

/**
 * Route registry.
 *
 * The app's destinations, in one table. It exists because three things have to
 * agree and used to drift apart:
 *
 *  - the **tab bar** (native and web read the same entries),
 *  - the **auth gate** (`meetings` and `account` are private; P3.3's
 *    `Stack.Protected` reads `access` from here),
 *  - any future **link surface** (account settings, home cards) that should
 *    only offer a route that exists.
 *
 * The last point is why a registry replaced the ported `core/config/nav.ts`
 * trees: that file described a web sidebar, including six admin/superadmin
 * routes and a dozen account sub-routes that no PR in this plan builds. A nav
 * row pointing at a route that does not exist is a guaranteed 404, so the rows
 * were deleted rather than hidden — they come back with their screens.
 *
 * `href` values are Expo Router paths, not the legacy Vite paths
 * (`/my-meetings` → `/meetings`).
 *
 * Adding a screen means adding a row here. Nothing enforces that at the file
 * level: Expo Router would happily route a file with no registry entry. What
 * *is* enforced is the reverse — the shells only render registry rows, so a
 * missing entry is a missing tab, which is visible on the first run.
 */

export type TabName = 'index' | 'quran' | 'meetings' | 'account';

export type AppHref = '/' | '/quran' | '/meetings' | '/account' | '/about';

export type RouteAccess = 'public' | 'private';

/** Literal keys, not `string`: `t()` checks them against the locale. */
export type RouteTitleKey =
  'nav.home' | 'nav.quran' | 'nav.meetings' | 'nav.account' | 'nav.about';

export type RouteDescriptionKey =
  'nav.quranDesc' | 'nav.meetingsDesc' | 'nav.accountDesc' | 'nav.aboutDesc';

export type AppRoute = {
  /** Expo Router route name inside `(tabs)`, or `null` when the route is not a tab. */
  readonly tab: TabName | null;
  readonly href: AppHref;
  readonly titleKey: RouteTitleKey;
  readonly descriptionKey?: RouteDescriptionKey;
  readonly icon: IconName;
  /**
   * Whether the route requires a session. Declared here, enforced in P3.3 —
   * two places would eventually disagree, and the gate is the wrong place to
   * discover a typo.
   */
  readonly access: RouteAccess;
  /**
   * Opt a **non-tab** route into the Home cards. Tabs opt in implicitly; About
   * is the first destination that is reachable from Account but is not a tab,
   * and a card for it belongs on Home without a second list to maintain.
   */
  readonly showOnHome?: true;
};

export type TabRoute = AppRoute & {
  readonly tab: TabName;
};

/**
 * Display order is array order. Private routes are marked `private` even though
 * nothing is gated yet: P3.3 consumes this table as-is.
 */
export const APP_ROUTES = [
  {
    tab: 'index',
    href: '/',
    titleKey: 'nav.home',
    icon: 'home',
    access: 'public',
  },
  {
    tab: 'quran',
    href: '/quran',
    titleKey: 'nav.quran',
    descriptionKey: 'nav.quranDesc',
    icon: 'book-open',
    access: 'public',
  },
  {
    tab: 'meetings',
    href: '/meetings',
    titleKey: 'nav.meetings',
    descriptionKey: 'nav.meetingsDesc',
    icon: 'video',
    access: 'private',
  },
  {
    tab: 'account',
    href: '/account',
    titleKey: 'nav.account',
    descriptionKey: 'nav.accountDesc',
    icon: 'user',
    access: 'private',
  },
  {
    tab: null,
    href: '/about',
    titleKey: 'nav.about',
    descriptionKey: 'nav.aboutDesc',
    icon: 'info',
    access: 'public',
    showOnHome: true,
  },
] as const satisfies readonly AppRoute[];

function hasTab(route: AppRoute): route is TabRoute {
  return route.tab !== null;
}

/**
 * Widened once, deliberately: `APP_ROUTES` is `as const`, so its element type is
 * a union of exact rows. Since P4.5 that union includes a non-tab row (`/about`),
 * and a type predicate over the wider `AppRoute` no longer narrows the exact
 * union — `AppRoute[]` is the shape the filter is allowed to narrow.
 */
const routes: readonly AppRoute[] = APP_ROUTES;

/** Tab destinations, derived so the two shells cannot disagree. */
export const TABS: readonly TabRoute[] = routes.filter(hasTab);

const ROUTES_BY_HREF = new Map<string, AppRoute>(
  APP_ROUTES.map((route) => [route.href, route]),
);

export function getRoute(href: string): AppRoute | undefined {
  return ROUTES_BY_HREF.get(href);
}

export function isAppHref(href: string): href is AppHref {
  return ROUTES_BY_HREF.has(href);
}

/** `false` for a route that does not exist — the check a link surface needs. */
export function requiresAuth(href: string): boolean {
  return getRoute(href)?.access === 'private';
}
