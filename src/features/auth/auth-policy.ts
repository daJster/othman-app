/**
 * Authentication gating switch (development mode).
 *
 * `false` while the app is being built out: every tab and subroute is reachable
 * without a session, and the sign-in screen remains available from the Home and
 * Account buttons. Set this to `true` to restore the registry-driven gate:
 *
 *  - private tabs disappear from the tab bars;
 *  - `/meetings`, `/account` and account subroutes redirect to sign-in;
 *  - `RequireAuth` blocks their screens.
 *
 * The sign-in implementation, session handling and route-policy tests stay
 * active either way; this flag only decides whether access is enforced.
 */
export const AUTH_GATING_ENABLED = false;
