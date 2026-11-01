import { useTranslation } from 'react-i18next';
import type { ViewProps } from 'react-native';
import { useThemeMode } from '@/providers/theme-provider';
import { SegmentedControl } from '@/ui/segmented-control';
import { THEME_OPTIONS } from './theme-options';

/**
 * Theme choice for the Account preferences section.
 *
 * Three modes, not two: `system` is the default and a binary control cannot
 * express "follow the OS". The navbar uses the same options as a cycle button;
 * this is the explicit, labelled form.
 */
export function ThemeToggle({ className, ...props }: ViewProps) {
  const { t } = useTranslation();
  const { mode, setMode } = useThemeMode();

  return (
    <SegmentedControl
      label={t('theme.title')}
      value={mode}
      options={THEME_OPTIONS.map(({ mode: value, labelKey }) => ({
        value,
        label: t(labelKey),
      }))}
      onChange={setMode}
      className={className}
      {...props}
    />
  );
}
