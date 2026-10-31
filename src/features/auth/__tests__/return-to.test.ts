import { sanitizeReturnTo } from '@/features/auth/return-to';

/**
 * The return destination is the one attacker-controlled input on the sign-in
 * screen, so the policy is pinned here: only in-app absolute paths survive.
 */
describe('sanitizeReturnTo', () => {
  it('keeps an app-internal path', () => {
    expect(sanitizeReturnTo('/meetings')).toBe('/meetings');
    expect(sanitizeReturnTo('/account/progress')).toBe('/account/progress');
    expect(sanitizeReturnTo('/reader/12')).toBe('/reader/12');
  });

  it('trims surrounding whitespace', () => {
    expect(sanitizeReturnTo('  /quran  ')).toBe('/quran');
  });

  it('falls back to home for anything that is not a path', () => {
    expect(sanitizeReturnTo(undefined)).toBe('/');
    expect(sanitizeReturnTo(null)).toBe('/');
    expect(sanitizeReturnTo(42)).toBe('/');
    expect(sanitizeReturnTo('')).toBe('/');
    expect(sanitizeReturnTo('meetings')).toBe('/');
    expect(sanitizeReturnTo('https://evil.test/steal')).toBe('/');
  });

  it('rejects protocol-relative and backslash forms', () => {
    // Both are normalized to an external origin by URL parsers.
    expect(sanitizeReturnTo('//evil.test')).toBe('/');
    expect(sanitizeReturnTo('/\\evil.test')).toBe('/');
    expect(sanitizeReturnTo('\\\\evil.test')).toBe('/');
  });

  it('rejects control characters and scheme-looking prefixes', () => {
    expect(sanitizeReturnTo('/quran\n')).toBe('/quran');
    expect(sanitizeReturnTo('/quran\u0000')).toBe('/');
    expect(sanitizeReturnTo('/javascript:alert(1)')).toBe(
      '/javascript:alert(1)',
    );
    expect(sanitizeReturnTo('javascript:alert(1)')).toBe('/');
  });

  it('refuses to loop back into sign-in', () => {
    expect(sanitizeReturnTo('/auth/sign-in')).toBe('/');
    expect(sanitizeReturnTo('/auth/sign-in?returnTo=%2F')).toBe('/');
  });

  it('honours a caller-supplied fallback', () => {
    expect(sanitizeReturnTo(undefined, '/quran')).toBe('/quran');
  });
});
