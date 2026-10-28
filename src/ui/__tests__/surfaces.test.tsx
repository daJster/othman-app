import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Badge } from '@/ui/badge';
import { Card, CardDescription, CardTitle } from '@/ui/card';
import { Separator } from '@/ui/separator';
import { Skeleton } from '@/ui/skeleton';
import { TONE_SURFACE_CLASSES, TONE_TEXT_CLASSES } from '@/ui/tone';

// RNTL 14 removes a render when the test that created it ends; calling
// `unmount()` mid-test instead leaves an act scope open and every later render
// in the file commits nothing. Tests here therefore never unmount by hand —
// they either render one subject per test or render several at once.

describe('Card', () => {
  it('renders its sections in order', async () => {
    await render(
      <Card testID="card">
        <CardTitle>Weekly halaqa</CardTitle>
        <CardDescription>Every Tuesday</CardDescription>
      </Card>,
    );

    expect(screen.getByTestId('card')).toBeTruthy();
    expect(screen.getByText('Weekly halaqa')).toBeTruthy();
    expect(screen.getByText('Every Tuesday')).toBeTruthy();
  });

  it('styles the title with the card foreground, not the page one', async () => {
    await render(<CardTitle>Title</CardTitle>);

    // A card sits on `bg-card`; the default `text-foreground` would be wrong on
    // a theme where the two differ.
    expect(screen.getByText('Title').props.className).toContain(
      'text-card-foreground',
    );
  });

  it('lets the caller override the card surface', async () => {
    await render(<Card testID="card" className="bg-muted" />);

    expect(screen.getByTestId('card').props.className).toContain('bg-muted');
  });
});

describe('Badge', () => {
  it('renders a label', async () => {
    await render(<Badge label="Today" />);

    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('treats a string child as a label', async () => {
    await render(<Badge variant="positive">Live</Badge>);

    // The string must land in a `Text`, not in the `View`: RN cannot render a
    // bare string and the tone would not apply.
    expect(screen.getByText('Live')).toBeTruthy();
  });

  it('keeps composed children untouched', async () => {
    await render(
      <Badge testID="badge">
        <Text testID="composed">3</Text>
      </Badge>,
    );

    expect(screen.getByTestId('composed')).toBeTruthy();
    expect(screen.getByTestId('badge')).toBeTruthy();
  });

  it('binds each status tone to the shared tone tables', async () => {
    await render(
      <>
        <Badge variant="positive" label="positive" testID="positive" />
        <Badge variant="info" label="info" testID="info" />
        <Badge variant="neutral" label="neutral" testID="neutral" />
      </>,
    );

    // Asserting the shared literals keeps `tone.ts` the single source of truth:
    // changing a class there must not require editing this test.
    for (const tone of ['positive', 'info', 'neutral'] as const) {
      expect(screen.getByTestId(tone).props.className).toContain(
        TONE_SURFACE_CLASSES[tone].split(' ')[0],
      );
      expect(screen.getByText(tone).props.className).toContain(
        TONE_TEXT_CLASSES[tone].split(' ')[0],
      );
    }
  });

  it('keeps the destructive variant on the app palette', async () => {
    await render(<Badge variant="destructive" label="Overdue" />);

    expect(screen.getByText('Overdue').props.className).toContain(
      'text-destructive-foreground',
    );
  });
});

describe('Separator', () => {
  it('is decorative and horizontal by default', async () => {
    await render(<Separator testID="line" />);

    const line = screen.getByTestId('line');
    expect(line.props.role).toBe('none');
    expect(line.props.className).toContain('h-px');
  });

  it('becomes a semantic divider when asked', async () => {
    await render(<Separator decorative={false} testID="line" />);

    expect(screen.getByTestId('line').props.role).toBe('separator');
  });

  it('stretches vertically', async () => {
    await render(<Separator orientation="vertical" testID="line" />);

    expect(screen.getByTestId('line').props.className).toContain(
      'self-stretch',
    );
  });
});

describe('Skeleton', () => {
  it('is hidden from assistive technology', async () => {
    await render(<Skeleton testID="skeleton" />);

    // A skeleton is deliberately excluded from the accessibility tree, so RNTL
    // skips it unless hidden elements are included.
    const node = screen.getByTestId('skeleton', {
      includeHiddenElements: true,
    });
    expect(node.props.accessibilityElementsHidden).toBe(true);
    expect(node.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('takes the size it is given', async () => {
    await render(<Skeleton testID="skeleton" className="h-4 w-3/4" />);

    const className = screen.getByTestId('skeleton', {
      includeHiddenElements: true,
    }).props.className;
    expect(className).toContain('h-4');
    expect(className).toContain('w-3/4');
  });
});
