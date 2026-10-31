import * as WebBrowser from 'expo-web-browser';

/**
 * Open an external page in the in-app browser.
 *
 * Only `https:` is accepted. Every caller passes a URL that came from outside
 * the app's own code — a meeting row, a footer link constant that may be edited
 * later — so this is an external boundary: handing an arbitrary scheme to the OS
 * would let a bad value trigger a deep link, a local file or a script. A
 * rejected value does nothing, which is better than a crash on a screen the user
 * cannot fix.
 *
 * `openBrowserAsync` keeps the browser's own chrome and a close button, so the
 * user never loses their place in the app.
 */
export async function openHttpsLink(url: string): Promise<void> {
  if (!/^https:\/\//i.test(url)) return;

  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    // No browser available (rare on iOS/Android, possible on a locked-down
    // device). There is nothing actionable to show inline.
  }
}
