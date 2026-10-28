import * as WebBrowser from 'expo-web-browser';
import { openHttpsLink } from '@/platform/browser';

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve()),
}));

const openBrowserAsync = WebBrowser.openBrowserAsync as jest.MockedFunction<
  typeof WebBrowser.openBrowserAsync
>;

beforeEach(() => {
  openBrowserAsync.mockClear();
});

describe('openHttpsLink', () => {
  it('opens an https link in the in-app browser', async () => {
    await openHttpsLink('https://kuttab-othman.web.app/');

    expect(openBrowserAsync).toHaveBeenCalledWith(
      'https://kuttab-othman.web.app/',
    );
  });

  it('refuses every scheme that is not https', async () => {
    // Callers pass URLs from outside the app (backend rows, config constants
    // that may be edited later), so this is the boundary that keeps a bad value
    // from reaching the OS.
    await openHttpsLink('http://kuttab-othman.web.app/');
    await openHttpsLink('javascript:alert(1)');
    await openHttpsLink('file:///etc/passwd');
    await openHttpsLink('othman://about');
    await openHttpsLink('');

    expect(openBrowserAsync).not.toHaveBeenCalled();
  });

  it('stays quiet when the device has no browser to open', async () => {
    openBrowserAsync.mockRejectedValueOnce(new Error('no browser'));

    await expect(
      openHttpsLink('https://kuttab-othman.web.app/'),
    ).resolves.toBeUndefined();
  });
});
