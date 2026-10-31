import * as WebBrowser from 'expo-web-browser';
import { openMeetLink } from '@/features/meetings/open-meet-link';

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve()),
}));

const openBrowserAsync = WebBrowser.openBrowserAsync as jest.MockedFunction<
  typeof WebBrowser.openBrowserAsync
>;

beforeEach(() => {
  openBrowserAsync.mockClear();
});

describe('openMeetLink', () => {
  it('opens an https link in the in-app browser', async () => {
    await openMeetLink('https://meet.google.com/abc-defg-hij');

    expect(openBrowserAsync).toHaveBeenCalledWith(
      'https://meet.google.com/abc-defg-hij',
    );
  });

  it('refuses every scheme that is not https', async () => {
    // The link is backend data, i.e. an external boundary: `javascript:` or a
    // custom scheme handed to the OS would act on the user's device.
    await openMeetLink('http://meet.google.com/abc');
    await openMeetLink('javascript:alert(1)');
    await openMeetLink('file:///etc/passwd');
    await openMeetLink('com.example.app://open');
    await openMeetLink('');

    expect(openBrowserAsync).not.toHaveBeenCalled();
  });

  it('stays quiet when the device has no browser to open', async () => {
    openBrowserAsync.mockRejectedValueOnce(new Error('no browser'));

    await expect(
      openMeetLink('https://meet.google.com/abc-defg-hij'),
    ).resolves.toBeUndefined();
  });
});
