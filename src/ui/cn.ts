import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge conditional class names, with later Tailwind utilities winning over
 * earlier ones.
 *
 * Note: `twMerge` only understands Tailwind utilities. Custom classes declared
 * in `global.css` are passed through untouched — precedence between a custom
 * class and a utility follows the CSS cascade, not argument order.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
