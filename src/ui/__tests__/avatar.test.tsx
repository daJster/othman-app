import { render, screen } from '@testing-library/react-native';
import { Avatar } from '@/ui/avatar';

/**
 * The RNR avatar renders a React Native `Image`, so the rendered tree is walked
 * instead of querying by component type.
 */
type TreeNode = {
  type: string;
  props: Record<string, unknown>;
  children: TreeNode[] | null;
};

function findNode(
  node: TreeNode | TreeNode[] | null,
  predicate: (node: TreeNode) => boolean,
): TreeNode | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findNode(child, predicate);
      if (found) return found;
    }
    return null;
  }

  if (predicate(node)) return node;

  return findNode(node.children, predicate);
}

function imageNode() {
  return findNode(
    screen.toJSON() as unknown as TreeNode,
    (node) => node.type === 'Image',
  );
}

describe('Avatar', () => {
  it('shows the initials of the first two words', async () => {
    await render(<Avatar name="Amina El Idrissi" testID="avatar" />);

    expect(screen.getByText('AE')).toBeTruthy();
  });

  it('ignores extra whitespace and a single word survives', async () => {
    await render(<Avatar name="  Othman  " testID="avatar" />);

    expect(screen.getByText('O')).toBeTruthy();
  });

  it('renders an image instead of initials when a source is given', async () => {
    await render(
      <Avatar
        name="Amina El Idrissi"
        src="https://example.com/amina.png"
        testID="avatar"
      />,
    );

    expect(imageNode()?.props.source).toEqual({
      uri: 'https://example.com/amina.png',
    });
    expect(screen.queryByText('AE')).toBeNull();
  });

  it('exposes the name to assistive technology', async () => {
    await render(<Avatar name="Amina" testID="avatar" />);

    expect(screen.getByTestId('avatar').props.accessibilityLabel).toBe('Amina');
  });

  it('renders an empty circle when it has neither name nor source', async () => {
    await render(<Avatar testID="avatar" />);

    expect(
      screen.getByTestId('avatar').props.accessibilityLabel,
    ).toBeUndefined();
    expect(imageNode()).toBeNull();
  });

  it('scales the initials with the avatar size', async () => {
    await render(<Avatar name="Amina" size="lg" />);

    expect(screen.getByText('A').props.className).toContain('text-sm');
  });
});
