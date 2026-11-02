import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { THEME_OPTIONS } from '@/features/settings/theme-options';
import { flatTrigger } from '@/features/navigation/web/flat-trigger';
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={flatTrigger()}
          accessibilityLabel={t('theme.title')}
          testID="nav-theme-trigger"
        >
          <Icon name="sun-moon" size={20} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48 bg-background">
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
              <Text variant="label">{t(option.labelKey)}</Text>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
