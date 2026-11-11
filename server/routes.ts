import type { HttpMethod } from './functions/types.ts';

/**
 * REST surface over the function registry.
 *
 * The routes are declarative: a path names a function, and the adapter turns
 * the matched segments into `event.params`. There is no handler logic here, so
 * the same function is reachable over REST and over the callable endpoint
 * without duplicating a check.
 */

export type Route = {
  method: HttpMethod;
  /** Template with `:name` segments. Static segments win by declaration order. */
  path: string;
  /** Key in `createFunctionRegistry()`. */
  name: string;
};

export const ROUTES: readonly Route[] = [
  { method: 'GET', path: '/health', name: 'system.health' },
  { method: 'GET', path: '/v1/health', name: 'system.health' },
  { method: 'GET', path: '/v1/system/stats', name: 'system.stats' },
  { method: 'GET', path: '/v1/events', name: 'system.events' },

  { method: 'POST', path: '/v1/auth/register', name: 'auth.register' },
  { method: 'POST', path: '/v1/auth/login', name: 'auth.login' },
  { method: 'POST', path: '/v1/auth/logout', name: 'auth.logout' },
  { method: 'GET', path: '/v1/auth/session', name: 'auth.session' },
  { method: 'POST', path: '/v1/auth/google', name: 'auth.google' },
  { method: 'PATCH', path: '/v1/auth/profile', name: 'auth.updateProfile' },
  {
    method: 'PATCH',
    path: '/v1/auth/preferences',
    name: 'auth.updatePreferences',
  },
  { method: 'DELETE', path: '/v1/auth/account', name: 'auth.deleteAccount' },

  // Static account routes before `/v1/accounts/:uid`.
  { method: 'GET', path: '/v1/accounts/me', name: 'accounts.me' },
  { method: 'PATCH', path: '/v1/accounts/me', name: 'accounts.meUpdate' },
  { method: 'GET', path: '/v1/accounts', name: 'accounts.list' },
  { method: 'POST', path: '/v1/accounts', name: 'accounts.create' },
  { method: 'GET', path: '/v1/accounts/:uid', name: 'accounts.get' },
  { method: 'PATCH', path: '/v1/accounts/:uid', name: 'accounts.update' },
  { method: 'DELETE', path: '/v1/accounts/:uid', name: 'accounts.remove' },

  { method: 'GET', path: '/v1/meetings', name: 'meetings.list' },
  { method: 'POST', path: '/v1/meetings', name: 'meetings.create' },
  { method: 'GET', path: '/v1/meetings/:id', name: 'meetings.get' },
  { method: 'PATCH', path: '/v1/meetings/:id', name: 'meetings.update' },
  { method: 'DELETE', path: '/v1/meetings/:id', name: 'meetings.remove' },
  { method: 'POST', path: '/v1/meetings/:id/rsvp', name: 'meetings.rsvp' },
  { method: 'DELETE', path: '/v1/meetings/:id/rsvp', name: 'meetings.unrsvp' },

  { method: 'GET', path: '/v1/quran/catalog', name: 'quran.catalog' },
  { method: 'GET', path: '/v1/quran/surahs/:number', name: 'quran.surah' },
  {
    method: 'GET',
    path: '/v1/quran/ayahs/:absoluteNumber',
    name: 'quran.ayah',
  },
  { method: 'GET', path: '/v1/quran/progress', name: 'quran.progress.list' },
  {
    method: 'PUT',
    path: '/v1/quran/progress/:surahNumber',
    name: 'quran.progress.put',
  },
  {
    method: 'DELETE',
    path: '/v1/quran/progress/:surahNumber',
    name: 'quran.progress.remove',
  },
  { method: 'GET', path: '/v1/quran/bookmarks', name: 'quran.bookmarks.list' },
  {
    method: 'POST',
    path: '/v1/quran/bookmarks',
    name: 'quran.bookmarks.create',
  },
  {
    method: 'PATCH',
    path: '/v1/quran/bookmarks/:id',
    name: 'quran.bookmarks.update',
  },
  {
    method: 'DELETE',
    path: '/v1/quran/bookmarks/:id',
    name: 'quran.bookmarks.remove',
  },
  { method: 'GET', path: '/v1/quran/notes', name: 'quran.notes.list' },
  { method: 'POST', path: '/v1/quran/notes', name: 'quran.notes.create' },
  {
    method: 'PATCH',
    path: '/v1/quran/notes/:id',
    name: 'quran.notes.update',
  },
  {
    method: 'DELETE',
    path: '/v1/quran/notes/:id',
    name: 'quran.notes.remove',
  },
];

export type RouteMatch =
  | { route: Route; params: Record<string, string> }
  | { route: null; methodMismatch: boolean };

function segments(pathname: string): string[] {
  return pathname.split('/').filter(Boolean);
}

export function matchRoute(method: HttpMethod, pathname: string): RouteMatch {
  const requestSegments = segments(pathname);
  let pathMatched = false;

  for (const route of ROUTES) {
    const routeSegments = segments(route.path);

    if (routeSegments.length !== requestSegments.length) continue;

    const params: Record<string, string> = {};
    let matches = true;

    for (let index = 0; index < routeSegments.length; index += 1) {
      const expected = routeSegments[index];
      const actual = requestSegments[index];

      if (expected.startsWith(':')) {
        params[expected.slice(1)] = decodeURIComponent(actual);
      } else if (expected !== actual) {
        matches = false;
        break;
      }
    }

    if (!matches) continue;

    pathMatched = true;
    if (route.method === method) return { route, params };
  }

  return { route: null, methodMismatch: pathMatched };
}
