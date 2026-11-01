import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button } from './button';
import { Icon } from './icon';
import { Text } from './text';

/**
 * The header shared by every sheet.
 *
 * A sheet dismisses with one X control, labelled for a screen reader. The
 * visible title carries the context, and `end` holds a trailing detail (for
 * example a status badge) without adding a second action row.
 */
export type SheetHeaderProps = {
  title: string;
  onClose: () => void;
  /** Keeps each sheet's existing test ID. */
  closeTestID?: string;
  /** Optional trailing detail before the close control. */
  end?: ReactNode;
};

export function SheetHeader({
  title,
  onClose,
  closeTestID,
  end,
}: SheetHeaderProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center justify-between gap-2">
      <Text variant="subtitle" numberOfLines={1} className="flex-1">
        {title}
      </Text>
      {end}
      <Button
        variant="ghost"
        size="icon"
        accessibilityLabel={t('action.close')}
        onPress={onClose}
        testID={closeTestID}
      >
        <Icon name="close" size={20} tone="muted" />
      </Button>
    </View>
  );
}
