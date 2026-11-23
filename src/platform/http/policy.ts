/**
 * Transport timeouts, named once.
 *
 * Every outbound request takes one of these unless its caller says otherwise.
 * The values used to be scattered (10 s in the HTTP client, 12 s in the backend
 * client, 4 s on the health probe); one number per purpose makes "how long do we
 * wait" a question with a single answer.
 */

/** The default for any read or write. */
export const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Liveness checks fail fast. A probe that waits as long as a read hides an
 * outage behind a spinner.
 */
export const PROBE_TIMEOUT_MS = 4_000;

/**
 * How often the internet probe re-checks while the app believes it is online.
 * A dropped Wi-Fi link with no browser event still gets noticed within a
 * minute, before a screen asks for something.
 */
export const ONLINE_RECHECK_MS = 60_000;

/**
 * How often the probe retries while offline. Short enough that putting the
 * phone back in signal is noticed without the user retrying by hand.
 */
export const OFFLINE_RETRY_MS = 10_000;
