import { BlurView as ExpoBlurView } from 'expo-blur';
import { withUniwind } from 'uniwind';

/**
 * `expo-blur` with `className` support, wrapped once at module level.
 *
 * Used for the translucent header and tab bars on iOS. `intensity` and `tint`
 * stay props because they are not style values.
 *
 * Note: Android does not render a real backdrop blur before API 31 and falls
 * back to a translucent surface — headers therefore also carry a background
 * colour, so the fallback is legible rather than transparent.
 */
export const BlurView = withUniwind(ExpoBlurView);
