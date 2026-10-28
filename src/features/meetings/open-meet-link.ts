import { openHttpsLink } from '@/platform/browser';

/**
 * Open a meeting link in the in-app browser.
 *
 * The link comes from the backend, which is an external boundary; the shared
 * `openHttpsLink` guard is what keeps a bad row from reaching the OS. This
 * wrapper exists for the name: a meeting card should say what it opens, not
 * repeat the scheme rule at the call site.
 */
export function openMeetLink(url: string): Promise<void> {
  return openHttpsLink(url);
}
