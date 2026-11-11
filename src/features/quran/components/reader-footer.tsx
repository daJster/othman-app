import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useDirection } from '@/i18n';
import { Button, ButtonText } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { formatReaderNumber } from '../format';

/**
 * The reader's bottom chrome.
 *
 * Previous/next are **reading-order** actions, not screen sides: in a mushaf
 * "next" moves left, so the arrow follows the language's direction while the
 * row order stays in `flex-row` (which already mirrors for RTL). This is what
 * keeps an English UI from turning pages backwards.
 *
 * At an edition boundary the button is disabled rather than hidden. Hiding it
 * would move the other button under the reader's thumb mid-turn; a disabled
 * control also has an accessible "disabled" state, so a screen reader can say
 * why nothing happened. The store already makes the action a no-op, so the
 * disabled prop is a UI contract, not the only guard.
 *
 * The counter is `tabular-nums`: without it the page number visibly shifts
 * width on every turn.
 */
export type ReaderFooterProps = {
  page: number;
  firstPage: number;
  lastPage: number;
  onPrevious: () => void;
  onNext: () => void;
};

export function ReaderFooter({
  page,
  firstPage,
  lastPage,
  onPrevious,
  onNext,
}: ReaderFooterProps) {
  const { t } = useTranslation();
  const { language } = useDirection();

  const atStart = page <= firstPage;
  const atEnd = page >= lastPage;
  /*
   * A mushaf is read right to left, so its page sequence is fixed: the previous
   * page lies to the right, the next one to the left, whatever the interface
   * language. Reading order is content, not chrome.
   */
  const previousIcon = 'chevron-right';
  const nextIcon = 'chevron-left';

  return (
    <View
      className="flex-row items-center justify-between gap-2 border-t border-glass-edge bg-glass px-2 pt-2 pb-safe"
      testID="reader-footer"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={atStart}
        accessibilityLabel={t('reader.previousPage')}
        onPress={onPrevious}
        testID="reader-prev"
      >
        <Icon name={previousIcon} size={16} />
        <ButtonText size="sm" variant="outline">
          {t('reader.previousPage')}
        </ButtonText>
      </Button>

      <Text variant="caption" tone="muted" className="tabular-nums">
        {t('reader.pageOf', {
          page: formatReaderNumber(page, language),
          total: formatReaderNumber(lastPage, language),
        })}
      </Text>

      <Button
        variant="outline"
        size="sm"
        disabled={atEnd}
        accessibilityLabel={t('reader.nextPage')}
        onPress={onNext}
        testID="reader-next"
      >
        <ButtonText size="sm" variant="outline">
          {t('reader.nextPage')}
        </ButtonText>
        <Icon name={nextIcon} size={16} />
      </Button>
    </View>
  );
}
