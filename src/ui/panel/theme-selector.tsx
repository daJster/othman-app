import { useTranslation } from 'react-i18next';
import { View, type ViewProps } from 'react-native';
import type { IconName } from '@/core/config';
import { useThemeMode, type ThemeMode } from '@/providers/theme-provider';
import { Button, ButtonText } from '../button';
import { ButtonGroup } from '../button-group';
import { cn } from '../cn';
import { Icon } from '../icon';
import { Text } from '../text';

/**
 * Appearance control: System / Light / Dark.
 *
 * This is the segmented form of the theme preference, for the Account page.
 * The dropdown form stays in the navbar and the reader menu, where a compact
 * trigger is the right shape. A visible three-way switch makes the choice
 * legible at a glance and keeps "System" — the only mode that follows the
 * device — from hiding inside a menu.
 */
const OPTIONS = [
  { mode: 'system', icon: 'monitor', labelKey: 'theme.system' },
  { mode: 'light', icon: 'sun', labelKey: 'theme.light' },
  { mode: 'dark', icon: 'moon', labelKey: 'theme.dark' },
] as const satisfies readonly {
  mode: ThemeMode;
  icon: IconName;
  labelKey: string;
}[];

export type ThemeSelectorProps = ViewProps & {
  /** Show the inline hint under the segments. */
  hint?: boolean;
};

export function ThemeSelector({
  hint = true,
  className,
  ...props
}: ThemeSelectorProps) {
  const { t } = useTranslation();
  const { mode, setMode } = useThemeMode();

  return (
    <View className={cn('gap-2', className)} {...props}>
      <ButtonGroup fullWidth>
        {OPTIONS.map((option) => {
          const selected = option.mode === mode;

          return (
            <Button
              key={option.mode}
              testID={`theme-option:${option.mode}`}
              variant={selected ? 'secondary' : 'ghost'}
              size="sm"
              accessibilityLabel={t(option.labelKey)}
              accessibilityState={{ selected }}
              onPress={() => setMode(option.mode)}
              className={cn(
                'border',
                selected ? 'border-glass-edge' : 'border-transparent',
              )}
            >
              <Icon
                name={option.icon}
                size={16}
                tone={selected ? 'foreground' : 'muted'}
              />
              <ButtonText variant={selected ? 'secondary' : 'ghost'} size="sm">
                {t(option.labelKey)}
              </ButtonText>
            </Button>
          );
        })}
      </ButtonGroup>

      {hint ? (
        <Text variant="caption" tone="muted">
          {t('theme.systemHint')}
        </Text>
      ) : null}
    </View>
  );
}
