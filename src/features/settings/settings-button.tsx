import type { ReactNode } from 'react';
import { Pressable } from '@/ui/pressable';

/**
 * The 44px shell shared by the two navbar settings controls.
 *
 * Kept local to the settings feature: it is not a general primitive, it is the
 * hit target those two buttons must share.
 */
export type SettingsButtonProps = {
  label: string;
  onPress: () => void;
  testID: string;
  children: ReactNode;
};

export function SettingsButton({
  label,
  onPress,
  testID,
  children,
}: SettingsButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      className="min-h-11 min-w-11 items-center justify-center rounded-md active:opacity-70"
    >
      {children}
    </Pressable>
  );
}
