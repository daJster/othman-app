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

  return {
    onPress,
    // A hidden trigger is removed from the accessibility tree on purpose, so
    // the query has to opt into hidden elements to see it at all.
    link: view.getByTestId('nav-tab', { includeHiddenElements: true }),
  };
}

describe('webTabAria', () => {
  it('announces the focused destination as the current page', () => {
    expect(webTabAria({ isFocused: true, hidden: false })).toEqual({
      role: 'tab',
      'aria-selected': 'true',
      'aria-current': 'page',
    });
  });

  it('marks a non-focused destination as a selectable tab', () => {
    expect(webTabAria({ isFocused: false, hidden: false })).toEqual({
      role: 'tab',
      'aria-selected': 'false',
      'aria-current': undefined,
    });
  });

  it('removes a hidden destination from the tree and the tab order', () => {
    expect(webTabAria({ isFocused: false, hidden: true })).toEqual({
      'aria-hidden': 'true',
      tabIndex: -1,
    });
  });
});

describe('WebTabLink', () => {
  it('renders a real anchor carrying its href and label', async () => {
    const { link } = await renderLink();

    expect(link.type).toBe('a');
    expect(link.props.href).toBe('/quran');
    expect(link.props['aria-label']).toBe('Quran');
    expect(link.props.role).toBe('tab');
    expect(link.props['aria-selected']).toBe('false');
    expect(link.props['aria-current']).toBeUndefined();
  });

  it('sets aria-current on the active destination only', async () => {
    const { link } = await renderLink({ isFocused: true });

    expect(link.props['aria-current']).toBe('page');
    expect(link.props['aria-selected']).toBe('true');
  });

  it('keeps a hidden trigger registered but invisible and unfocusable', async () => {
    const { link } = await renderLink({ hidden: true, href: '/account' });

    expect(link.props.href).toBe('/account');
    expect(link.props['aria-hidden']).toBe('true');
    expect(link.props.tabIndex).toBe(-1);
    expect(link.props.role).toBeUndefined();
    expect(link.props['aria-label']).toBeUndefined();
    expect(link.props.style.display).toBe('none');
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

  it('ignores clicks on a hidden destination', async () => {
    const { onPress, link } = await renderLink({ hidden: true });

    await fireEvent(link, 'click', { button: 0 });

    expect(onPress).not.toHaveBeenCalled();
  });
});
