import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguageChoice } from '@/features/settings/use-language-choice';
import { flatTrigger } from '@/features/navigation/web/flat-trigger';
import { LANGUAGES, type Language } from '@/i18n';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

/**
 * Language control in the web bar: a ghost button with the globe icon.
 *
 * Icon-only at every width. The name used to sit beside it from `sm` up, which
 * made the one control that is a *setting* the widest item in the trailing
 * cluster and crowded the destinations it sits next to. The current name still
 * reaches assistive tech through `accessibilityLabel`, and the open menu shows
 * both options in full — the trigger only has to say "this is the language
 * control", and a globe says that in every language.
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
          className={flatTrigger('h-11 min-w-11 justify-center px-2')}
          accessibilityLabel={`${t('language.title')}: ${currentName}`}
          testID="nav-language-trigger"
        >
          <Icon name="languages" size={20} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
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
