/**
 * Return-destination validation.
 *
 * The sign-in screen accepts `?returnTo=` because a protected deep link should
 * resume where the user was going. That value is attacker-controllable, so it is
 * never handed to the router as-is:
 *
 *  - only an app-internal absolute path is allowed (`/quran`), not a full URL;
 *  - protocol-relative (`//evil.test`) and backslash (`\\evil.test`) forms are
 *    rejected, because browsers/routers normalize them to external origins;
 *  - control characters are rejected;
 *  - the sign-in route itself is rejected, so a failed sign-in cannot loop.
 *
 * Anything else falls back to Home. The function is pure so the policy is
 * tested without a navigation container.
 */

const FALLBACK = '/';
const SIGN_IN_PATH = '/auth/sign-in';

export function sanitizeReturnTo(
  value: unknown,
  fallback: string = FALLBACK,
): string {
  if (typeof value !== 'string') return fallback;

  const candidate = value.trim();
  if (!candidate) return fallback;

  // Must be an absolute path, and exactly one leading slash: `//host` is a
  // protocol-relative URL, not an in-app route.
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return fallback;

  // A backslash is treated as a separator by several URL parsers.
  if (candidate.includes('\\')) return fallback;

  // Any scheme-looking prefix or control character is not a route.
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(candidate)) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(candidate)) return fallback;

  if (candidate === SIGN_IN_PATH || candidate.startsWith(`${SIGN_IN_PATH}?`)) {
    return fallback;
  }

  return candidate;
}
