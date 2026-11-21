import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { THEME_OPTIONS } from '@/features/settings/theme-options';
import { useExclusiveBarMenu } from '@/features/navigation/web/bar-menu';
import { chromeTrigger } from '@/features/navigation/web/flat-trigger';
import { useThemeMode, type ThemeMode } from '@/providers/theme-provider';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

/**
 * Theme control in the web bar: a ghost icon that opens the three modes.
 *
 * The trigger is icon-only on purpose. The current mode is a preference, not a
 * label worth permanent space next to four destinations; the menu marks the
 * active row instead. No border and no chevron: this is a ghost button, not a
 * form `Select`, and a chevron would promise a value field the bar does not
 * have.
 *
 * The same choices live on Account; this is the shortcut, not a second source
 * of truth (`THEME_OPTIONS` and `useThemeMode` are shared).
 */
export function ThemeMenu() {
  const { t } = useTranslation();
  const { mode, setMode } = useThemeMode();
  // The trigger shows the mode it is in: a sun in the light theme, a moon in
  // the dark one, and the neutral system glyph when the OS decides. Two
  // distinct Lucide marks read at a glance; one neutral glyph only said
  // "appearance" and never told the reader which side they were on.
  const current = THEME_OPTIONS.find((option) => option.mode === mode);

  return (
    <DropdownMenu {...useExclusiveBarMenu('theme')}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={chromeTrigger()}
          accessibilityLabel={t('theme.title')}
          testID="nav-theme-trigger"
        >
          <Icon name={current?.icon ?? 'sun-moon'} size={18} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(next) => setMode(next as ThemeMode)}
        >
          {THEME_OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option.mode}
              value={option.mode}
              testID={`nav-theme-${option.mode}`}
            >
              <Icon name={option.icon} size={16} tone="muted" />
              <Text variant="label">{t(option.labelKey)}</Text>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
