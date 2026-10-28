import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button, ButtonText } from '@/ui/button';

describe('Button', () => {
  it('renders its label and reports a button role', async () => {
    await render(<Button label="Save" testID="subject" />);

    expect(screen.getByText('Save')).toBeTruthy();
    expect(screen.getByTestId('subject').props.accessibilityRole).toBe(
      'button',
    );
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} />);

    fireEvent.press(screen.getByText('Save'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire while disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" disabled onPress={onPress} testID="b" />);

    fireEvent.press(screen.getByTestId('b'));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('b').props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it('renders composed children instead of a label', async () => {
    await render(
      <Button variant="outline" size="sm">
        <ButtonText variant="outline" size="sm">
          With icon
        </ButtonText>
      </Button>,
    );

    expect(screen.getByText('With icon')).toBeTruthy();
    expect(screen.getByText('With icon').props.className).toContain(
      'text-foreground',
    );
  });

  it('uses the label colour of the variant, not the surface', async () => {
    await render(<Button variant="destructive" label="Delete" />);

    expect(screen.getByText('Delete').props.className).toContain(
      'text-destructive-foreground',
    );
  });
});
