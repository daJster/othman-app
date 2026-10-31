import { Image as ExpoImage } from 'expo-image';
import { withUniwind } from 'uniwind';

/**
 * `expo-image` with `className` support.
 *
 * Wrapped once, at module level, and re-exported — never wrap the same
 * component in two files (it would create two independent className resolvers).
 *
 * Safe to import on web: `expo-image` renders a regular `<img>` there. Avatars
 * and the mushaf page both go through this, so `contentFit`, caching and the
 * `transition` fade stay consistent across the app.
 */
export const Image = withUniwind(ExpoImage);
