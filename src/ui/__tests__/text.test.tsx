import { act, render, screen } from '@testing-library/react-native';
import { i18n, setLanguageState } from '@/i18n';
import { Text } from '@/ui/text';

afterEach(async () => {
  // The language store is module state; leaving it on Arabic would change every
  // later assertion in this file.
  await act(async () => {
    setLanguageState({ language: 'en', ready: true });
    await i18n.changeLanguage('en');
  });
});

describe('Text', () => {
  it('renders its content', async () => {
    await render(<Text>مرحبا بالعالم</Text>);

    expect(screen.getByText('مرحبا بالعالم')).toBeTruthy();
  });

  it('receives the variant and tone it is given', async () => {
    await render(
      <Text variant="title" tone="primary" testID="subject">
        Title
      </Text>,
    );

    // `className` is inert in Jest (Uniwind compiles it in Metro), so the test
    // asserts the props that reach the host component instead of styles.
    const node = screen.getByTestId('subject');
    expect(node.props.className).toContain('text-2xl');
    expect(node.props.className).toContain('text-primary');
  });

  it('merges a caller className over the variant', async () => {
    await render(
      <Text variant="title" className="text-destructive" testID="subject">
        Danger
      </Text>,
    );

    // tailwind-merge resolves the conflict in favour of the caller.
    expect(screen.getByTestId('subject').props.className).toContain(
      'text-destructive',
    );
  });

  it('passes standard Text props through', async () => {
    await render(
      <Text numberOfLines={2} selectable testID="subject">
        body
      </Text>,
    );

    const node = screen.getByTestId('subject');
    expect(node.props.numberOfLines).toBe(2);
    expect(node.props.selectable).toBe(true);
    expect(node.props.allowFontScaling).not.toBe(false);
  });

  it('names the UI font for the active direction', async () => {
    await render(<Text testID="subject">text</Text>);

    expect(screen.getByTestId('subject').props.className).toContain('font-ui');

    await act(async () => {
      setLanguageState({ language: 'ar', ready: true });
      await i18n.changeLanguage('ar');
    });

    // Direction drives the family: RN has no fallback list, so the wrong name
    // is not a degraded render, it is tofu.
    expect(screen.getByTestId('subject').props.className).toContain(
      'font-arabic',
    );
  });

  it('lets the caller pin a family regardless of direction', async () => {
    await render(
      <Text family="quran" testID="subject">
        بِسْمِ اللَّهِ
      </Text>,
    );

    expect(screen.getByTestId('subject').props.className).toContain(
      'font-quran',
    );
  });
});
