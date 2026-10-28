import {
  APP_ROUTES,
  TABS,
  getRoute,
  isAppHref,
  requiresAuth,
} from '@/features/navigation/route-registry';

/**
 * The registry is the contract between the tab shells, the auth gate and any
 * link surface. These tests pin the parts those consumers rely on.
 */
describe('route registry', () => {
  it('lists the four tabs in display order', () => {
    expect(TABS.map((tab) => tab.href)).toEqual([
      '/',
      '/quran',
      '/meetings',
      '/account',
    ]);
  });

  it('gives every route a unique href and every tab a unique name', () => {
    const hrefs = APP_ROUTES.map((route) => route.href);
    const tabs = TABS.map((tab) => tab.tab);

    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(new Set(tabs).size).toBe(tabs.length);
  });

  it('gates meetings and account, and leaves home and quran public', () => {
    expect(
      TABS.filter((tab) => tab.access === 'private').map((t) => t.href),
    ).toEqual(['/meetings', '/account']);
  });

  it('finds a route by its href', () => {
    expect(getRoute('/quran')).toMatchObject({
      tab: 'quran',
      titleKey: 'nav.quran',
      icon: 'book-open',
    });
  });

  it('reports legacy and unbuilt paths as missing', () => {
    // The ported web nav pointed at these; the registry exists so no link can
    // offer one of them and land on the 404 route.
    expect(getRoute('/my-meetings')).toBeUndefined();
    expect(getRoute('/admin/dashboard')).toBeUndefined();
    expect(getRoute('/account/progress')).toBeUndefined();
  });

  it('narrows hrefs and answers the auth question from one table', () => {
    expect(isAppHref('/meetings')).toBe(true);
    expect(isAppHref('/admin/dashboard')).toBe(false);

    expect(requiresAuth('/account')).toBe(true);
    expect(requiresAuth('/quran')).toBe(false);
    // Unknown routes are not treated as protected: the 404 route handles them.
    expect(requiresAuth('/nope')).toBe(false);
  });
});
