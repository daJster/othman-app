import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '@/ui/states';
import { ScreenView } from '@/ui/screen';

/**
 * Recoverable state for a link that cannot be read.
 *
 * Shown when the parser rejects a malformed/duplicated parameter, or when the
 * resolver cannot find the requested surah/ayah in the attached edition. It is
 * deliberately not a 404: the app is usable, and the retry action takes the
 * reader to the Quran tab (which owns the normal entry path) instead of leaving
 * them on a dead route.
 *
 * No fabricated position is substituted. Opening page 1 for `surah=999` would
 * make a broken link look successful and hide the bug from whoever shared it.
 */
export function ReaderLinkError() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ScreenView>
      <ErrorState
        title={t('reader.linkInvalidTitle')}
        description={t('reader.linkInvalidDescription')}
        onRetry={() => router.replace('/quran')}
      />
    </ScreenView>
  );
}
