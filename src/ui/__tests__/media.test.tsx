import { render, screen } from '@testing-library/react-native';
import { BlurView } from '@/ui/blur';
import { Image } from '@/ui/image';

/**
 * Both components are third-party and reach Uniwind only through `withUniwind`.
 * These tests prove the wrapper is wired: `className` survives the HOC and the
 * component's own props still arrive.
 *
 * The rendered tree is walked because both render native adapters
 * (`ViewManagerAdapter_ExpoImage`, `ViewManagerAdapter_ExpoBlur`); the wrapper
 * `View` the libraries add is an implementation detail, not the subject.
 */
type TreeNode = {
  type: string;
  props: Record<string, unknown>;
  children: TreeNode[] | null;
};

function findNode(
  node: TreeNode | TreeNode[] | null,
  type: string,
): TreeNode | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found: TreeNode | null = findNode(child, type);
      if (found) return found;
    }
    return null;
  }

  return node.type === type ? node : findNode(node.children, type);
}

function tree() {
  return screen.toJSON() as unknown as TreeNode;
}

describe('Image', () => {
  it('renders the source it is given', async () => {
    await render(
      <Image
        testID="page"
        source={{ uri: 'https://example.com/page-1.png' }}
        contentFit="contain"
        transition={150}
      />,
    );

    const node = findNode(tree(), 'ViewManagerAdapter_ExpoImage');
    // `expo-image` normalizes a single source into a list before it reaches the
    // native view.
    expect(node?.props.source).toEqual([
      { uri: 'https://example.com/page-1.png' },
    ]);
    expect(node?.props.contentFit).toBe('contain');
    expect(node?.props.transition).toEqual({ duration: 150 });
  });

  it('accepts a className through the wrapper', async () => {
    await render(
      <Image
        testID="page"
        source={{ uri: 'https://example.com/page-1.png' }}
        className="h-full w-full rounded-lg"
      />,
    );

    // In Jest `className` is inert (Uniwind compiles it in Metro), so the
    // assertion is that the HOC forwards it rather than dropping it.
    expect(
      findNode(tree(), 'ViewManagerAdapter_ExpoImage')?.props.className,
    ).toBe('h-full w-full rounded-lg');
  });
});

describe('BlurView', () => {
  it('keeps intensity and tint', async () => {
    await render(<BlurView testID="header" intensity={40} tint="dark" />);

    const node = findNode(tree(), 'ViewManagerAdapter_ExpoBlur');
    expect(node?.props.intensity).toBe(40);
    expect(node?.props.tint).toBe('dark');
  });

  it('puts the className on the wrapper and keeps the testID queryable', async () => {
    await render(
      <BlurView testID="header" intensity={40} className="p-4">
        <BlurView testID="inner" />
      </BlurView>,
    );

    expect(screen.getByTestId('header').props.className).toBe('p-4');
    expect(screen.getByTestId('inner')).toBeTruthy();
  });
});
