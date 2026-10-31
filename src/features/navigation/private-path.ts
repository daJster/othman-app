import { APP_ROUTES } from './route-registry';

/**
 * True when a path belongs to a private section.
 *
 * The tab navigator hides private tabs while signed out, which also removes
 * them from the native tab navigator's route table: a Home card or deep link to
 * `/meetings` can fall back to Home before the screen's own `RequireAuth` ever
 * mounts. The root gate uses this path check so the redirect happens above the
 * tab navigator, independent of which triggers are currently rendered.
 *
 * Private roots come from the registry (`/meetings`, `/account`), so a new
 * private tab is covered automatically. Subroutes such as `/account/edit` are
 * covered by the prefix rule.
 */
const PRIVATE_ROOTS = APP_ROUTES.filter(
  (route) => route.access === 'private',
).map((route) => route.href);

export function isPrivateAppPath(pathname: string): boolean {
  return PRIVATE_ROOTS.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );
}
