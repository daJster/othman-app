/**
 * Web link click policy.
 *
 * A tab is a real anchor on web, so the browser must keep ownership of
 * modified and non-primary clicks: middle-click and Cmd/Ctrl-click open a new
 * tab, Shift-click opens a window. Only an unmodified primary click is handled
 * by the router (and has its default prevented).
 *
 * Kept platform-free so it can be unit-tested in Jest.
 */
export type WebLinkClick = {
  button?: number;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  defaultPrevented?: boolean;
};

export function shouldHandleWebLink(event: WebLinkClick): boolean {
  if (event.defaultPrevented) return false;
  if (event.button !== undefined && event.button !== 0) return false;

  return !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}
