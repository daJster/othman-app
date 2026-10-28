import { render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { Icon } from '@/ui/icon';

/**
 * Icons are resolved through the platform registry: SF Symbols on iOS,
 * Material Icons everywhere else. `jest-expo` runs these tests as iOS, so the
 * Android branch is exercised by swapping `Platform.OS` for the duration of the
 * test.
 *
 * The rendered tree is inspected instead of the component type: the icon sets
 * are third-party components and their internal host names are an
 * implementation detail we do not want to pin.
 */
type Rendered = { type: string; props: Record<string, unknown> } | null;

function rendered() {
  return screen.toJSON() as unknown as Rendered;
}

/** `Platform` is plain data, so a direct swap is enough — and restored exactly. */
async function asAndroid(run: () => Promise<void>) {
  const platform = Platform as unknown as { OS: string };
  const original = platform.OS;

  platform.OS = 'android';
  try {
    await run();
  } finally {
    platform.OS = original;
  }
}

describe('Icon', () => {
  it('uses the SF Symbol name on iOS', async () => {
    await render(<Icon name="cog" />);

    const node = rendered();
    expect(node?.type).toBe('ViewManagerAdapter_SymbolModule');
    expect(node?.props.name).toBe('gearshape');
    expect(node?.props.size).toBe(20);
  });

  it('uses a Material Icon glyph elsewhere', async () => {
    await asAndroid(async () => {
      await render(<Icon name="cog" />);

      const node = rendered();
      expect(node?.type).toBe('Text');
      // Material Icons is an icon font: the glyph is a font character, scaled
      // to the requested size, and must not follow the OS text-size setting.
      expect(node?.props).toMatchObject({ allowFontScaling: false });
      expect(node?.props.colorClassName).toBe('accent-foreground');
    });
  });

  it('carries the tone as an accent class', async () => {
    await render(<Icon name="trash" tone="destructive" />);

    expect(rendered()?.props.tintColorClassName).toBe('accent-destructive');
  });

  it('is hidden from assistive technology — the label belongs to the control', async () => {
    await render(<Icon name="trash" />);

    expect(rendered()?.props.accessibilityElementsHidden).toBe(true);
  });

  it('resolves every registry name', async () => {
    const names = [
      'book-open',
      'chart-line',
      'check-circle',
      'cog',
      'external-link',
      'file-text',
      'megaphone',
      'trash',
      'university',
      'video',
      'alert-circle',
      'inbox',
    ] as const;

    for (const name of names) {
      await render(<Icon name={name} />);

      // A missing registry entry would render a nameless symbol, so "a name
      // that is a non-empty string" is the assertion that matters here.
      expect(rendered()?.props.name).toEqual(expect.any(String));
      expect(rendered()?.props.name).not.toBe('');
    }
  });
});
