import * as WebBrowser from 'expo-web-browser';

/**
 * Open a meeting link in the in-app browser.
 *
 * Only `https:` is accepted. The link comes from the backend, which is an
 * external boundary; handing an arbitrary scheme to the OS would let a bad row
 * trigger a deep link or a local file. A rejected value does nothing, which is
 * better than a crash on a screen the user cannot fix.
 *
 * `openBrowserAsync` shows the browser's own chrome and a close button, so the
 * user never loses their place in the app. (The legacy web page used a raw
 * anchor; a mobile app has no tab to return to.)
 */
export async function openMeetLink(url: string): Promise<void> {
  if (!/^https:\/\//i.test(url)) return;

  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    // No browser available (rare on iOS/Android, possible on a locked-down
    // device). There is nothing actionable to show inline.
  }
}
