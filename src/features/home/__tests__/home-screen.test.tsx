import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import HomeScreen from '@/app/(tabs)/index';
import { HOME_LINKS } from '@/features/home/feature-links';

/**
 * `Link` needs a mounted Expo Router container, and `Head` needs a navigation
 * object for `useIsFocused`. Neither is what this test is about: the screen's
 * job is to choose the content and the destinations. The mock turns each link
 * into a testable node keyed by its `href`, which is exactly the contract the
 * screen is responsible for.
 */
jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Link: ({ href, children }: { href: string; children: ReactNode }) =>
      React.createElement(View, { testID: `link:${href}` }, children),
  };
});

jest.mock('expo-router/head', () => () => null);

describe('HomeScreen', () => {
  it('opens with the app identity', async () => {
    await render(<HomeScreen />);

    expect(screen.getByText('Othman')).toBeTruthy();
    expect(screen.getByText('Contemplate the Book of Allah')).toBeTruthy();
  });

  it('shows the basmalah in the hero', async () => {
    await render(<HomeScreen />);

    expect(
      screen.getByText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'),
    ).toBeTruthy();
  });

  it('shows the featured verse with its reference', async () => {
    await render(<HomeScreen />);

    expect(screen.getByText('Verse of the Day')).toBeTruthy();
    expect(
      screen.getByText(
        'Indeed, this Quran guides to that which is most upright',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Al-Isra 9')).toBeTruthy();
  });

  it('links to every destination in the registry list', async () => {
    await render(<HomeScreen />);

    expect(screen.getAllByTestId(/^link:/)).toHaveLength(HOME_LINKS.length);

    for (const route of HOME_LINKS) {
      expect(screen.getByTestId(`link:${route.href}`)).toBeTruthy();
    }
  });

  it('describes each destination with the same copy as its tab', async () => {
    await render(<HomeScreen />);

    expect(screen.getByText('Read the mushaf page by page')).toBeTruthy();
    expect(screen.getByText('Your upcoming sessions')).toBeTruthy();
    expect(screen.getByText('Profile, progress and preferences')).toBeTruthy();
    expect(screen.getByText('App information and links')).toBeTruthy();
  });

  it('does not advertise features the app does not ship', async () => {
    await render(<HomeScreen />);

    // The legacy page sold tafsir, search and bookmarks. None of them exists
    // yet, so they must not return as placeholders.
    expect(screen.queryByText('Tafsir')).toBeNull();
    expect(screen.queryByText('Search')).toBeNull();
    expect(screen.queryByText('Bookmarks')).toBeNull();
  });
});
