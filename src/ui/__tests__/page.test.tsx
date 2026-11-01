import { render, screen } from '@testing-library/react-native';
import { Page } from '@/ui/page';

describe('Page', () => {
  it('owns the default column, gutter and measure', async () => {
    await render(<Page testID="page" />);

    const className = screen.getByTestId('page').props.className;
    expect(className).toContain('mx-auto');
    expect(className).toContain('w-full');
    expect(className).toContain('px-4');
    expect(className).toContain('sm:px-5');
    expect(className).toContain('max-w-3xl');
  });

  it('uses the wide measure only when asked', async () => {
    await render(<Page testID="wide" width="wide" />);

    expect(screen.getByTestId('wide').props.className).toContain('max-w-6xl');
  });

  it('keeps the caller vertical rhythm', async () => {
    await render(<Page testID="page" className="pt-8" />);

    expect(screen.getByTestId('page').props.className).toContain('pt-8');
  });
});
