import { shouldHandleWebLink } from '@/features/navigation/web-link';
import type { WebLinkClick } from '@/features/navigation/web-link';

describe('shouldHandleWebLink', () => {
  it('handles a plain primary click', () => {
    expect(shouldHandleWebLink({ button: 0 })).toBe(true);
    expect(shouldHandleWebLink({})).toBe(true);
  });

  it('leaves modified clicks to the browser', () => {
    expect(shouldHandleWebLink({ button: 0, metaKey: true })).toBe(false);
    expect(shouldHandleWebLink({ button: 0, ctrlKey: true })).toBe(false);
    expect(shouldHandleWebLink({ button: 0, shiftKey: true })).toBe(false);
    expect(shouldHandleWebLink({ button: 0, altKey: true })).toBe(false);
  });

  it('leaves middle and secondary clicks to the browser', () => {
    expect(shouldHandleWebLink({ button: 1 })).toBe(false);
    expect(shouldHandleWebLink({ button: 2 })).toBe(false);
  });

  it('does not re-handle an already-prevented click', () => {
    expect(
      shouldHandleWebLink({ button: 0, defaultPrevented: true } as WebLinkClick),
    ).toBe(false);
  });
});
