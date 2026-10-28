import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/ui/states';
import { ScreenView } from '@/ui/screen';
import { Text } from '@/ui/text';

/**
 * Reader route — stub.
 *
 * The page is a full-screen modal because the mushaf is a distinct mode: it
 * hides the tab bar, and its own page-turn gesture competes with the stack's
 * back-swipe (hence `predictiveBackGestureEnabled: false` in `app.config.ts`).
 * That presentation is declared once in the root layout (`src/app/_layout.tsx`),
 * not here, so the route's chrome cannot drift from the navigator that owns it.
 *
 * `page` is validated here rather than trusted: a deep link can carry anything,
 * and the real reader (P5.3) will need a 1–604 range anyway.
 */
export default function ReaderScreen() {
  const { t } = useTranslation();
  const { page } = useLocalSearchParams<{ page: string }>();
  const pageNumber = Number(page);
  const valid =
    Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= 604;

  return (
    <ScreenView>
      {valid ? (
        <EmptyState
          title={`${t('nav.quran')} · ${pageNumber}`}
          description={t('state.emptyDescription')}
        />
      ) : (
        <EmptyState
          title={t('error.404.title')}
          description={t('error.404.description')}
        />
      )}
      <Text variant="caption" tone="muted" className="p-4 text-center">
        {t('nav.quranDesc')}
      </Text>
    </ScreenView>
  );
}
