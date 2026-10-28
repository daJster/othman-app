import { render, screen } from '@testing-library/react-native';
import { Input } from '@/ui/input';

describe('Input', () => {
  it('passes the value and placeholder through', async () => {
    await render(
      <Input
        testID="input"
        placeholder="البريد الإلكتروني"
        value=""
        onChangeText={() => {}}
      />,
    );

    const node = screen.getByTestId('input');
    expect(node.props.placeholder).toBe('البريد الإلكتروني');
    expect(node.props.value).toBe('');
  });

  it('makes the placeholder and caret theme-aware by default', async () => {
    await render(<Input testID="input" />);

    const node = screen.getByTestId('input');
    // Colour props are not style objects: Uniwind resolves them from the
    // `accent-` class props, so a default must exist or they stay black/white.
    expect(node.props.placeholderTextColorClassName).toBe(
      'accent-muted-foreground',
    );
    expect(node.props.selectionColorClassName).toBe('accent-primary');
    expect(node.props.cursorColorClassName).toBe('accent-primary');
  });

  it('lets the caller override a colour class', async () => {
    await render(
      <Input
        testID="input"
        placeholderTextColorClassName="accent-destructive"
      />,
    );

    expect(
      screen.getByTestId('input').props.placeholderTextColorClassName,
    ).toBe('accent-destructive');
  });

  it('marks an invalid field visually', async () => {
    await render(<Input testID="input" invalid />);

    // React Native's `accessibilityState` has no `invalid` member and RN has no
    // `aria-invalid`, so validity is conveyed by the border plus the error text
    // the screen renders next to the field — not by an accessibility flag.
    expect(screen.getByTestId('input').props.className).toContain(
      'border-destructive',
    );
  });

  it('does not set the invalid border when valid', async () => {
    await render(<Input testID="input" />);

    expect(screen.getByTestId('input').props.className).toContain(
      'border-input',
    );
  });
});
