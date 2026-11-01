import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SheetHeader } from '@/ui/sheet-header';

describe('SheetHeader', () => {
  it('renders the title and one close control labelled for a screen reader', async () => {
    await render(<SheetHeader title="Surahs" onClose={jest.fn()} />);

    expect(screen.getByText('Surahs')).toBeTruthy();
    expect(screen.getByLabelText('Close')).toBeTruthy();
    expect(screen.queryByText('Close')).toBeNull();
  });

  it('runs the close action', async () => {
    const onClose = jest.fn();
    await render(
      <SheetHeader
        title="Surahs"
        onClose={onClose}
        closeTestID="sheet-close"
      />,
    );

    await fireEvent.press(screen.getByTestId('sheet-close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders a trailing detail before the close control', async () => {
    await render(
      <SheetHeader
        title="Surah 2"
        onClose={jest.fn()}
        end={<Text>50%</Text>}
      />,
    );

    expect(screen.getByText('50%')).toBeTruthy();
  });
});
