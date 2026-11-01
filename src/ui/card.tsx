import type { ViewProps } from 'react-native';
import { Card as RNRCARD } from '@/components/ui/card';
import { cn } from './cn';

/**
 * The card surface.
 *
 * The rendered component is react-native-reusables' `Card`. The app adds its
 * own padding and tighter gap so existing compositions keep their rhythm; a
 * caller can still override either through `className`.
 */
export function Card({ className, ...props }: ViewProps) {
  return <RNRCARD className={cn('gap-3 p-4', className)} {...props} />;
}
