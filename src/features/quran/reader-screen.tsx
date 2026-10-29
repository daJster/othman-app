import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { resolveEditionKey } from '@/core/domain/quran/editions';
import type { EditionBboxes, QuranEdition } from '@/core/types';
import { useDirection } from '@/i18n';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { ScreenView } from '@/ui/screen';
import { EmptyState, ErrorState, Loading } from '@/ui/states';
import { Text } from '@/ui/text';
import { PageTurn } from './components/page-turn';
import { MushafPage } from './components/mushaf-page';
import {
  useReaderActions,
  useReaderAyahKey,
  useReaderBboxes,
  useReaderDirection,
  useReaderPage,
  useReaderPreferredEditionKey,
  useReaderRestored,
  useReaderStatus,
  useRestoreReader,
} from './store/use-reader';
import { useEditionBboxes } from './use-edition-bboxes';
import { usePagePrefetch } from './use-page-prefetch';
import { usePageTurn } from './use-page-turn';
import { useQuranCatalog } from './use-quran-catalog';
import type { SwipeDirection } from './swipe';

/**
 * The mushaf reader.
 *
 * Boot order is explicit, because each step depends on the previous one and
 * fetching in the wrong order costs a multi-megabyte download:
 *
 *  1. read the stored edition + page (`useRestoreReader`),
 *  2. load the catalog (editions + surah metadata),
 *  3. resolve the *preferred* edition against it,
 *  4. load that edition's bbox tables,
 *  5. attach both to the reader store, which restores the page and its label.
 *
 * Until step 1 finishes the screen must not resolve an edition: the stored
 * preference is not known yet, so it would fetch the default edition's tables
 * and then fetch the stored one. That is the whole reason `restored` exists on
 * the store.
 *
 * `initialPage` is a deep link. It wins over the stored page, but only once and
 * only after the edition is attached — `goToPage` clamps it into the edition, so
 * `/reader/9999` lands on the last page instead of a blank scan.
 *
 * The back control is deliberately minimal: P5.4 replaces it with the reader's
 * own header (surah label, page indicator, menus). It exists here so the modal
 * is not a trap on iOS, where a full-screen modal has no swipe-to-dismiss.
 */
export type ReaderScreenProps = {
  initialPage?: number | null;
};

export function ReaderScreen({ initialPage = null }: ReaderScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { isRTL } = useDirection();

  useRestoreReader();

  const restored = useReaderRestored();
  const preferredEditionKey = useReaderPreferredEditionKey();
  const catalog = useQuranCatalog();

  const exit = useCallback(() => {
    if (router.canGoBack()) {
      router.back();

      return;
    }

    router.replace('/quran');
  }, [router]);

  let body: ReactNode;

  if (!restored || catalog.state.status === 'pending') {
    body = <ReaderLoading />;
  } else if (catalog.state.status === 'error') {
    body = (
      <ErrorState
        title={t('state.errorTitle')}
        description={t('state.errorDescription')}
        onRetry={catalog.state.retry}
      />
    );
  } else {
    const editions = catalog.state.data.editions;
    const editionKey = resolveEditionKey(editions, preferredEditionKey);

    body = editionKey ? (
      <ReaderBody
        editions={editions}
        edition={editions[editionKey]}
        initialPage={initialPage}
      />
    ) : (
      <EmptyState
        title={t('nav.quran')}
        description={t('state.emptyDescription')}
      />
    );
  }

  return (
    <ScreenView>
      <View className="flex-row items-center border-b border-border px-2 py-1">
        <Button
          variant="ghost"
          size="sm"
          accessibilityLabel={t('action.back')}
          onPress={exit}
          testID="reader-back"
        >
          <Icon name={isRTL ? 'chevron-right' : 'chevron-left'} size={18} />
          <Text variant="label">{t('action.back')}</Text>
        </Button>
      </View>

      {body}
    </ScreenView>
  );
}

type ReaderBodyProps = {
  editions: Readonly<Record<string, QuranEdition>>;
  edition: QuranEdition;
  initialPage: number | null;
};

function ReaderBody({ editions, edition, initialPage }: ReaderBodyProps) {
  const bboxesQuery = useEditionBboxes(edition);
  const {
    attachEdition,
    goToPage,
    selectAyah,
    clearSelection,
    clearDirection,
  } = useReaderActions();
  const { turnForward, turnBackward } = usePageTurn();

  const status = useReaderStatus();
  const page = useReaderPage();
  const ayahKey = useReaderAyahKey();
  const direction = useReaderDirection();
  const bboxes = useReaderBboxes();

  const editionBboxes: EditionBboxes | null =
    bboxesQuery.state.status === 'ready' ? bboxesQuery.state.data : null;

  // Attaching writes to the store; depending on the query *result* (a new
  // object every render) instead of its data would re-run this on every write.
  useEffect(() => {
    if (!editionBboxes) return;

    attachEdition(editions, editionBboxes);
  }, [attachEdition, editionBboxes, editions]);

  usePagePrefetch(edition, page);

  // A link is applied once. Re-running it on every store change would undo the
  // reader's page turn, since the param never changes after mount.
  const linkedPage = useRef<number | null>(null);

  useEffect(() => {
    if (status !== 'ready' || initialPage === null) return;
    if (linkedPage.current === initialPage) return;

    linkedPage.current = initialPage;
    goToPage(initialPage);
  }, [goToPage, initialPage, status]);

  const handleSwipe = useCallback(
    (turn: SwipeDirection) => {
      if (turn === 'forward') {
        turnForward();

        return;
      }

      turnBackward();
    },
    [turnBackward, turnForward],
  );

  if (bboxesQuery.state.status === 'error') {
    return <QueryError onRetry={bboxesQuery.state.retry} />;
  }

  if (!editionBboxes || status !== 'ready' || !bboxes) {
    return <ReaderLoading />;
  }

  const pageRows = bboxes.byPage[String(page)];

  return (
    <PageTurn
      key={page}
      direction={direction}
      onSwipe={handleSwipe}
      onSettled={clearDirection}
    >
      <MushafPage
        edition={edition}
        page={page}
        ayat={pageRows}
        selectedAyahKey={ayahKey}
        onSelectAyah={selectAyah}
        onClearSelection={clearSelection}
      />
    </PageTurn>
  );
}

/**
 * The bbox tables are the slow part (a few megabytes), so their loading and
 * error states are separate from the catalog's: the catalog may have resolved
 * long ago, and retrying it would not fix a failed bbox download.
 *
 * One component for every loading frame on this screen (boot, catalog and
 * bboxes), so the `testID` the tests assert cannot drift between branches.
 */
function ReaderLoading() {
  const { t } = useTranslation();

  return <Loading label={t('action.loading')} testID="reader-loading" />;
}

function QueryError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();

  return (
    <ErrorState
      title={t('state.errorTitle')}
      description={t('state.errorDescription')}
      onRetry={onRetry}
    />
  );
}
