import { render, screen } from '@testing-library/react-native';
import { Button, ButtonGroup } from '@/ui/button-group';
import { Button as PlainButton } from '@/ui/button';

describe('ButtonGroup', () => {
  it('renders its segments in a row', async () => {
    await render(
      <ButtonGroup testID="subject">
        <Button label="Monthly" />
        <Button label="Annual" />
      </ButtonGroup>,
    );

    expect(screen.getByText('Monthly')).toBeTruthy();
    expect(screen.getByText('Annual')).toBeTruthy();
    expect(screen.getByTestId('subject').props.className).toContain('flex-row');
  });

  it('shares the width equally when fullWidth', async () => {
    await render(
      <ButtonGroup fullWidth testID="subject">
        <Button label="Monthly" testID="first" />
        <Button label="Annual" testID="second" />
      </ButtonGroup>,
    );

    expect(screen.getByTestId('subject').props.className).toContain('w-full');
    expect(screen.getByTestId('first').props.className).toContain('flex-1');
    expect(screen.getByTestId('second').props.className).toContain('flex-1');
  });

  it('re-exports the app Button', () => {
    expect(Button).toBe(PlainButton);
  });
});
