import { useTranslation } from 'react-i18next';
import type { ViewProps } from 'react-native';
import { useThemeMode, type ThemeMode } from '@/providers/theme-provider';
import { SegmentedControl } from './segmented-control';

/**
 * Theme toggle.
 *
 * Three modes, not two: `system` is the default and a binary control cannot
 * express "follow the OS". Labels come from i18n, so the control reads
 * correctly in both languages.
 */
const MODES: readonly {
  mode: ThemeMode;
  labelKey: 'theme.system' | 'theme.light' | 'theme.dark';
}[] = [
  { mode: 'system', labelKey: 'theme.system' },
  { mode: 'light', labelKey: 'theme.light' },
  { mode: 'dark', labelKey: 'theme.dark' },
];

export function ThemeToggle({ className, ...props }: ViewProps) {
  const { t } = useTranslation();
  const { mode, setMode } = useThemeMode();

  return (
    <SegmentedControl
      label={t('theme.title')}
      value={mode}
      options={MODES.map(({ mode, labelKey }) => ({
        value: mode,
        label: t(labelKey),
      }))}
      onChange={setMode}
      className={className}
      {...props}
    />
  );
}
