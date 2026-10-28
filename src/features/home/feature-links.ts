import {
  APP_ROUTES,
  type AppRoute,
  type RouteDescriptionKey,
} from '@/features/navigation/route-registry';

/**
 * Destinations offered on Home, in display order.
 *
 * Derived from the route registry rather than written out as literals: a Home
 * card is a link surface, and a card pointing at a route that no longer exists
 * is a guaranteed 404 that no other check would catch. Taking the row from
 * `APP_ROUTES` also means the title, description and icon cannot drift from the
 * tab that owns them.
 *
 * Tabs opt in implicitly (Home itself excepted, since a card back to Home is
 * noise); a non-tab route opts in with `showOnHome`. About is the first such
 * row, and the flag keeps this filter from growing an `href === '/about'` case.
 *
 * A route without a `descriptionKey` is skipped instead of rendered with an
 * empty line.
 */
type HomeLink = AppRoute & { readonly descriptionKey: RouteDescriptionKey };

const HOME_TABS: ReadonlySet<string> = new Set([
  'quran',
  'meetings',
  'account',
]);

/**
 * Widened once, deliberately: `APP_ROUTES` is `as const`, so its element type
 * is a union of five exact rows and a type predicate narrowing it to
 * `HomeLink` (a wider shape) is rejected. `AppRoute[]` is the shape the filter
 * is allowed to narrow.
 */
const routes: readonly AppRoute[] = APP_ROUTES;

export const HOME_LINKS: readonly HomeLink[] = routes.filter(
  (route): route is HomeLink =>
    route.descriptionKey !== undefined &&
    (route.tab === null ? route.showOnHome === true : HOME_TABS.has(route.tab)),
);
