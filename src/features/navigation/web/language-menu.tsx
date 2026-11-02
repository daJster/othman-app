import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguageChoice } from '@/features/settings/use-language-choice';
import { LANGUAGES, type Language } from '@/i18n';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

/**
 * Language control in the web bar: a ghost button with the globe-like icon and
 * the current language's own name ("English", "Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©").
 *
 * It shows the full name, not the old `AR`/`EN` short code: the name is the
 * thing a reader recognises, and the short code only reads as a developer
 * label. From `sm` up the name sits beside the icon; below `sm` the four
 * labelled destinations leave ~90 px for the trailing controls, so the button
 * is icon-only there and the name travels in its `accessibilityLabel`.
 *
 * No border and no chevron: a ghost button opens a menu, it is not a `Select`.
 */
export function LanguageMenu() {
  const { t } = useTranslation();
  const { language, select } = useLanguageChoice();
  const current =
    LANGUAGES.find((option) => option.code === language) ?? LANGUAGES[0];
  const currentName = t(current.labelKey);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="md"
          className="h-11 min-w-11 justify-center gap-2 px-2"
          accessibilityLabel={`${t('language.title')}: ${currentName}`}
          testID="nav-language-trigger"
        >
          <Icon name="languages" size={20} />
          <Text variant="label" className="hidden sm:block">
            {currentName}
          </Text>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48 bg-background">
        <DropdownMenuRadioGroup
          value={language}
          onValueChange={(next) => void select(next as Language)}
        >
          {LANGUAGES.map((option) => (
            <DropdownMenuRadioItem
              key={option.code}
              value={option.code}
              testID={`nav-language-${option.code}`}
            >
              <Text variant="label">{t(option.labelKey)}</Text>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
