import { visibleTabs } from '@/features/navigation/visible-tabs';
import { TABS } from '@/features/navigation/route-registry';

/**
 * The tab filter is registry-derived, so these tests describe the *policy*
 * rather than a hard-coded list: a private row may only disappear while signed
 * out, and adding a row to the registry must not require touching a shell.
 */
describe('visibleTabs', () => {
  it('shows every tab while signed in', () => {
    expect(visibleTabs(TABS, true)).toEqual(TABS);
  });

  it('hides the private tabs while signed out', () => {
    const hrefs = visibleTabs(TABS, false).map((tab) => tab.href);

    expect(hrefs).toEqual(['/', '/quran']);
    expect(hrefs).not.toContain('/meetings');
    expect(hrefs).not.toContain('/account');
  });

  it('keeps public tabs in their registry order', () => {
    expect(visibleTabs(TABS, false).map((tab) => tab.tab)).toEqual([
      'index',
      'quran',
    ]);
  });

  it('does not mutate the registry', () => {
    const before = [...TABS];

    visibleTabs(TABS, false);

    expect(TABS).toEqual(before);
  });
});
