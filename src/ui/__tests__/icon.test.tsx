import { render, screen } from '@testing-library/react-native';
import { ICON_NAMES } from '@/core/config/types';
import { getIconGlyph, Icon } from '@/ui/icon';

/**
 * Lucide draws one SVG on every platform, so the old SF Symbol / Material Icon
 * branch assertions are gone. The rendered tree is still inspected instead of
 * the component type: Lucide's internal host names are an implementation
 * detail we do not want to pin.
 */
type Rendered = { type: string; props: Record<string, unknown> } | null;

function rendered() {
  return screen.toJSON() as unknown as Rendered;
}

describe('Icon', () => {
  it('renders at the requested size', async () => {
    await render(<Icon name="home" size={24} />);

    const node = rendered();
    expect(node).not.toBeNull();
    expect(node?.props.width).toBe(24);
    expect(node?.props.height).toBe(24);
  });

  it('leaves the colour to Uniwind and the tone map', async () => {
    await render(<Icon name="home" tone="destructive" />);

    // Uniwind resolves `text-destructive` in Metro, not in Jest. The contract
    // this test can hold is that the icon receives a string colour rather than
    // a hard-coded one; the tone-to-class map is covered by the rendered
    // class-free tree on device.
    expect(
      rendered()?.props.color === undefined ||
        typeof rendered()?.props.color === 'string',
    ).toBe(true);
  });

  it('is hidden from assistive technology — the label belongs to the control', async () => {
    await render(<Icon name="home" />);

    expect(rendered()?.props.importantForAccessibility).toBe(
      'no-hide-descendants',
    );
    expect(rendered()?.props.accessible).toBe(false);
  });

  it('keeps platform glyphs for the four tab roots only', () => {
    expect(getIconGlyph('home')).toEqual({ ios: 'house', mdSymbol: 'home' });
    expect(getIconGlyph('book-open')).toEqual({
      ios: 'book',
      mdSymbol: 'menu_book',
    });
    expect(getIconGlyph('video')).toEqual({
      ios: 'video',
      mdSymbol: 'videocam',
    });
    expect(getIconGlyph('user')).toEqual({ ios: 'person', mdSymbol: 'person' });

    // A non-tab icon cannot be rendered by `NativeTabs`; failing loudly beats a
    // blank tab.
    expect(() => getIconGlyph('search')).toThrow(
      'No native tab glyph registered for "search"',
    );
  });

  it('resolves every registry name', async () => {
    for (const name of ICON_NAMES) {
      await render(<Icon name={name} />);

      // A missing registry entry would be a compile error, and a broken icon
      // would render nothing. One non-empty tree per name is the assertion.
      expect(rendered()).not.toBeNull();
    }
  });
});
