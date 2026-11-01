import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useDirection } from '@/i18n';
import { Button } from './button';
import { HEADING_ROLE, headingAriaLevel } from './heading';
import { Icon } from './icon';
import { Text } from './text';

/**
 * The page header.
 *
 * One row, one level-1 title, one dismissal. Pushed pages use the labelled
 * chevron; form sheets pass a text Cancel through `start`; a trailing action
 * such as Save goes in `end`. Pages that render this must not render a second
 * heading at level 1.
 */
export type PageHeaderProps = {
  title: string;
  /** Pushed page: renders a labelled chevron back control. */
  onBack?: () => void;
  /** Replaces the back control (e.g. a text Cancel on a form sheet). */
  start?: ReactNode;
  /** Trailing control, e.g. a Save action. */
  end?: ReactNode;
  testID?: string;
  backTestID?: string;
};

export function PageHeader({
  title,
  onBack,
  start,
  end,
  testID,
  backTestID,
}: PageHeaderProps) {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  const leading =
    start ??
    (onBack ? (
      <Button
        variant="ghost"
        size="icon"
        accessibilityLabel={t('action.back')}
        onPress={onBack}
        testID={backTestID}
      >
        <Icon name={isRTL ? 'chevron-right' : 'chevron-left'} size={20} />
      </Button>
    ) : null);

  return (
    <View
      testID={testID}
      className="flex-row items-center gap-2 border-b border-border px-2 py-2"
    >
      {leading}
      <Text
        variant="title"
        numberOfLines={1}
        className="flex-1"
        {...HEADING_ROLE}
        {...headingAriaLevel(1)}
      >
        {title}
      </Text>
      {end}
    </View>
  );
}
