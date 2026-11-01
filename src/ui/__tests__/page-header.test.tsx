import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PageHeader } from '@/ui/page-header';

describe('PageHeader', () => {
  it('renders the title as the level-1 page header', async () => {
    await render(<PageHeader title="About" />);

    const header = screen.getByRole('heading');
    expect(header).toHaveTextContent('About');
    expect(header.props['aria-level']).toBe(1);
  });

  it('offers a labelled back control on a pushed page', async () => {
    const onBack = jest.fn();
    await render(
      <PageHeader title="About" onBack={onBack} backTestID="back" />,
    );

    await fireEvent.press(screen.getByLabelText('Back'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('replaces the back control with the start slot', async () => {
    await render(
      <PageHeader title="Edit profile" start={<Text>Cancel</Text>} />,
    );

    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.queryByLabelText('Back')).toBeNull();
  });

  it('renders the end slot after the title', async () => {
    await render(<PageHeader title="Edit profile" end={<Text>Save</Text>} />);

    expect(screen.getByText('Save')).toBeTruthy();
  });
});
