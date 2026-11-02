import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '@/i18n';
import { SettingsDropdown } from './settings-dropdown';
import type { SettingsDropdownVariant } from './settings-dropdown.types';
import { useLanguageChoice } from './use-language-choice';

/**
 * Language choice, shared by the settings surfaces.
 *
 * Switching is immediate; on native, `I18nManager` only fully applies after a
 * relaunch, so the user is told when that is required (see
 * `useLanguageChoice`, which the navbar menu also uses).
 */
export type LanguageDropdownProps = {
  variant?: SettingsDropdownVariant;
  className?: string;
  testID?: string;
};

export function LanguageDropdown({
  variant = 'row',
  className,
  testID = 'language-dropdown',
}: LanguageDropdownProps) {
  const { t } = useTranslation();
  const { language, select } = useLanguageChoice();

  return (
    <SettingsDropdown
      label={t('language.title')}
      value={language}
      options={LANGUAGES.map(({ code, labelKey }) => ({
        value: code,
        label: t(labelKey),
        shortLabel:
          code === 'ar' ? t('language.arShort') : t('language.enShort'),
      }))}
      onChange={(next) => void select(next)}
      variant={variant}
      icon="languages"
      className={className}
      testID={testID}
    />
  );
}
