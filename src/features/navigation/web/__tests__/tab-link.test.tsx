import { fireEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { render } from '@/test-utils/render';
import { WebTabLink, webTabAria } from '@/features/navigation/web/tab-link';

type LinkProps = ComponentProps<typeof WebTabLink>;

async function renderLink(overrides: Partial<LinkProps> = {}) {
  const onPress = jest.fn();
  const view = await render(
    <WebTabLink
      label="Quran"
      icon="book-open"
      isFocused={false}
      href="/quran"
      testID="nav-tab"
      onPress={onPress}
      {...overrides}
    />,
  );

  return { onPress, link: view.getByTestId('nav-tab') };
}

describe('webTabAria', () => {
  it('marks the current destination as the page', () => {
    expect(webTabAria({ isFocused: true })).toEqual({
      'aria-current': 'page',
    });
  });

  it('leaves every other destination without a current marker', () => {
    expect(webTabAria({ isFocused: false })).toEqual({
      'aria-current': undefined,
    });
  });
});

describe('WebTabLink', () => {
  it('renders a real anchor carrying its href and label', async () => {
    const { link } = await renderLink();

    expect(link.type).toBe('a');
    expect(link.props.href).toBe('/quran');
    expect(link.props['aria-label']).toBe('Quran');
    expect(link.props['aria-current']).toBeUndefined();
    // Navigation links, not a tab widget: no role/selection to promise
    // arrow-key semantics the bar does not implement.
    expect(link.props.role).toBeUndefined();
    expect(link.props['aria-selected']).toBeUndefined();
  });

  it('sets aria-current on the active destination only', async () => {
    const { link } = await renderLink({ isFocused: true });

    expect(link.props['aria-current']).toBe('page');
  });

  it('hands a primary click to the router', async () => {
    const { onPress, link } = await renderLink();
    const event = { button: 0, preventDefault: jest.fn() };

    await fireEvent(link, 'click', event);

    expect(onPress).toHaveBeenCalledWith(event);
  });

  it.each([
    ['meta', { metaKey: true }],
    ['ctrl', { ctrlKey: true }],
    ['shift', { shiftKey: true }],
    ['alt', { altKey: true }],
    ['middle button', { button: 1 }],
  ])('leaves a %s click to the browser', async (_label, modifier) => {
    const { onPress, link } = await renderLink();

    await fireEvent(link, 'click', { button: 0, ...modifier });

    expect(onPress).not.toHaveBeenCalled();
  });
});
