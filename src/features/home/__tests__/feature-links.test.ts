import { HOME_LINKS } from '@/features/home/feature-links';
import { getRoute } from '@/features/navigation/route-registry';

/**
 * The Home cards are a link surface, and the registry exists so a link surface
 * can only offer routes that are real. These tests encode that rule: every card
 * resolves through `getRoute`, and each destination appears once.
 */
describe('HOME_LINKS', () => {
  it('points every card at a registered route', () => {
    expect(HOME_LINKS.length).toBeGreaterThan(0);

    for (const link of HOME_LINKS) {
      expect(getRoute(link.href)).toBe(link);
    }
  });

  it('offers the reader, the meetings and the account, in that order', () => {
    expect(HOME_LINKS.map((link) => link.href)).toEqual([
      '/quran',
      '/meetings',
      '/account',
    ]);
  });

  it('only offers destinations that can describe themselves', () => {
    for (const link of HOME_LINKS) {
      expect(link.descriptionKey).toBeTruthy();
    }
  });
});
