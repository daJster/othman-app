import { useRouter } from 'expo-router';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Share, View } from 'react-native';
import {
  ALL_READERS,
  DEFAULT_SHAYKH_IDENTIFIER,
  getShaykh,
  isAyahNumberValid,
  shaykhAudioUrl,
} from '@/core/config';
import {
  absoluteAyahNumber,
  stepAyah,
  type AyahDirection,
  type AyahRef,
} from '@/core/domain/quran/audio';
import { resolveEditionKey } from '@/core/domain/quran/editions';
import type { EditionBboxes, QuranEdition, SurahMetadata } from '@/core/types';
import { useDirection } from '@/i18n';
import { EmptyState, ErrorState, Loading } from '@/ui/states';
import { ScreenView } from '@/ui/screen';
import { resolveSelectedAyah } from './ayah-content';
import {
  AyahPanelSheet,
  type ReaderPanel,
} from './components/ayah-panel-sheet';
import { AudioSheet } from './components/audio-sheet';
import { EditionPickerSheet } from './components/edition-picker-sheet';
import { MushafPage } from './components/mushaf-page';
import { PageTurn } from './components/page-turn';
import { ReaderFooter } from './components/reader-footer';
import { ReaderHeader } from './components/reader-header';
import { ReaderLinkError } from './components/reader-link-error';
import {
  ReaderMenuSheet,
  type ReaderMenuAction,
} from './components/reader-menu-sheet';
import { SurahPickerSheet } from './components/surah-picker-sheet';
import { buildQuranShareUrl, resolveQuranLink } from './links';
import {
  useReaderActions,
  useReaderAyahKey,
  useReaderBboxes,
  useReaderDirection,
  useReaderEdition,
  useReaderEditionKey,
  useReaderPage,
  useReaderPreferredEditionKey,
  useReaderRestored,
  useReaderStatus,
  useReaderSurah,
  useRestoreReader,
} from './store/use-reader';
import { useAyahContent } from './use-ayah-content';
import { useAyahAudio } from './use-ayah-audio';
import { useAudioPrefetch } from './use-audio-prefetch';
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
 * Chrome (P5.4) is a column, not an overlay: header, page, footer. That is what
 * guarantees it never covers Quran text at any size, and it means the scan is
 * re-fitted by `MushafPage` when the chrome hides. The header stays mounted
 * through loading and failure so the exit action is always reachable.
 *
 * Edition selection is *requested* here and applied in `ReaderBody` only once
 * that edition's bbox tables exist. A request that is superseded before its
 * query resolves never reaches the store, which is what makes rapid switching
 * safe: the stale response belongs to a component that no longer exists.
 */
export type ReaderScreenProps = {
  initialPage?: number | null;
  initialSurah?: number | null;
  initialAyah?: number | null;
  /**
   * Local-notes scope (`user:<uid>` or `guest`). The route passes the signed-in
   * account; the default keeps tests and any embedded reader on guest notes.
   */
  notesNamespace?: string;
};

/**
 * Which sheet is open. One at a time, so two sheets cannot argue.
 *
 * Audio is a sheet, but its player is not: playback is owned by this screen so
 * closing the panel (or switching sheets) never stops the recitation.
 */
type Sheet = 'surah' | 'edition' | 'menu' | 'audio' | null;

export function ReaderScreen({
  initialPage = null,
  initialSurah = null,
  initialAyah = null,
  notesNamespace = 'guest',
}: ReaderScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { language } = useDirection();

  useRestoreReader();

  const restored = useReaderRestored();
  const preferredEditionKey = useReaderPreferredEditionKey();
  const catalog = useQuranCatalog();

  // The store's attached edition wins over the stored preference after a
  // switch; the local request wins over both while its data is loading.
  const storeEditionKey = useReaderEditionKey();
  const attachedEdition = useReaderEdition();
  const attachedBboxes = useReaderBboxes();
  const status = useReaderStatus();
  const page = useReaderPage();
  const surahNumber = useReaderSurah();
  const ayahKey = useReaderAyahKey();

  const { goToAyah, goToPage, goToSurah } = useReaderActions();
  const { turnForward, turnBackward } = usePageTurn();

  const [requestedEditionKey, setRequestedEditionKey] = useState<string | null>(
    null,
  );
  const [chromeVisible, setChromeVisible] = useState(true);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [panel, setPanel] = useState<ReaderPanel | null>(null);
  // Reciter, auto-read and wrap are session state: they reset when the reader
  // is left, unlike the edition (a reading preference worth persisting).
  const [reciterId, setReciterId] = useState<string>(DEFAULT_SHAYKH_IDENTIFIER);
  const [autoRead, setAutoRead] = useState(false);
  const [wrap, setWrap] = useState(false);

  const exit = useCallback(() => {
    if (router.canGoBack()) {
      router.back();

      return;
    }

    router.replace('/quran');
  }, [router]);

  const toggleChrome = useCallback(() => {
    setChromeVisible((visible) => !visible);
  }, []);

  // A deep link is applied once, after the edition and its geometry are
  // attached. The flag lives here, not in `ReaderBody`, because `ReaderBody`
  // remounts when the edition changes: a per-body ref would re-apply the link
  // on a switch and undo the reader's new position.
  const linkApplied = useRef(false);
  const linkStartPage = useRef<number | null>(null);
  const hasInitialLink = initialSurah !== null || initialPage !== null;

  const linkTarget =
    hasInitialLink && status === 'ready' && attachedEdition && attachedBboxes
      ? resolveQuranLink(
          { page: initialPage, surah: initialSurah, ayah: initialAyah },
          attachedEdition,
          attachedBboxes,
        )
      : null;

  useEffect(() => {
    if (linkApplied.current || linkTarget === null) return;

    linkApplied.current = true;
    // The route-sync effect below runs in the same commit, still seeing the
    // pre-link page. Remember where we started so it can wait for the store
    // update to render instead of writing the old page into the URL.
    linkStartPage.current = page;

    if (linkTarget.kind === 'ayah') {
      goToAyah(linkTarget.surah, linkTarget.ayah);

      return;
    }

    if (linkTarget.kind === 'page') goToPage(linkTarget.page);
  }, [goToAyah, goToPage, linkTarget, page]);

  // Keep the route segment equal to the page the reader is actually on.
  //
  // Without this, a page turn only changed the store: the URL stayed at
  // `/reader/1`, so refreshing (or sharing the address bar) sent the reader
  // back to the page they started from. The ayah/surah params are dropped once
  // consumed, otherwise a later turn would re-apply the original deep link.
  useEffect(() => {
    if (initialPage === null) return;

    // A deep link is resolved after the catalog/bboxes attach. Until it has
    // been applied, syncing would rewrite the URL with the pre-link page and
    // discard the surah/ayah parameters the link needs.
    if (hasInitialLink && !linkApplied.current) return;

    if (linkStartPage.current !== null) {
      if (page === linkStartPage.current) return;

      linkStartPage.current = null;
    }

    if (initialPage === page && initialSurah === null && initialAyah === null) {
      return;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.pathname = `/reader/${page}`;
      // Consumed link params must not survive a turn, or a reload would
      // re-apply the original ayah over the newer page.
      url.searchParams.delete('surah');
      url.searchParams.delete('ayah');
      window.history.replaceState(window.history.state, '', url);

      return;
    }

    router.setParams({
      page: String(page),
      surah: undefined,
      ayah: undefined,
    });
  }, [hasInitialLink, initialAyah, initialPage, initialSurah, page, router]);

  let body: ReactNode;
  let edition: QuranEdition | null = null;
  let editions: Readonly<Record<string, QuranEdition>> = {};
  let surahs: Readonly<Record<string, SurahMetadata>> = {};

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
    editions = catalog.state.data.editions;
    surahs = catalog.state.data.surahs;

    const editionKey = resolveEditionKey(
      editions,
      requestedEditionKey ?? storeEditionKey ?? preferredEditionKey,
    );

    edition = editionKey ? editions[editionKey] : null;

    body = edition ? (
      <ReaderBody
        // Remounting per edition gives the new bbox query its own lifecycle, so
        // a superseded request cannot attach through the old component.
        key={edition.key}
        editions={editions}
        edition={edition}
        onToggleChrome={toggleChrome}
      />
    ) : (
      <EmptyState
        title={t('nav.quran')}
        description={t('state.emptyDescription')}
      />
    );
  }

  if (linkTarget?.kind === 'invalid') {
    body = <ReaderLinkError />;
  }

  const surah = surahs[String(surahNumber)] ?? null;
  const surahName = surah
    ? language === 'ar'
      ? surah.name
      : surah.nameEnglish
    : null;

  const chromeEdition = attachedEdition ?? edition;

  // The selected ayah's canonical identity comes from the bbox row the tap
  // landed on, not from the local ayah key: on a page that crosses a surah
  // boundary the key repeats and would fetch the wrong surah's ayah.
  const selectedAyah = resolveSelectedAyah(attachedBboxes, page, ayahKey);
  const ayahContent = useAyahContent(selectedAyah?.absoluteNumber ?? null);

  // One lookup, shared by every step below: the same surah metadata that
  // auto-advance uses decides what "next" and "previous" mean.
  const ayahCountOf = (surahNumberToCount: number) =>
    surahs[String(surahNumberToCount)]?.ayahCount ?? null;

  const reciter = getShaykh(reciterId);
  const audioSource =
    selectedAyah === null
      ? null
      : shaykhAudioUrl(reciter, selectedAyah.absoluteNumber);

  const step = (direction: AyahDirection): AyahRef | null =>
    selectedAyah === null
      ? null
      : stepAyah(
          { surah: selectedAyah.surah, ayah: selectedAyah.ayah },
          direction,
          ayahCountOf,
          wrap,
        );

  const previousStep = step('backward');
  const nextStep = step('forward');
  const nextAbsolute =
    nextStep === null ? null : absoluteAyahNumber(nextStep, ayahCountOf);

  // Exactly one item is prefetched, and it is the same item auto-advance will
  // select — not `shaykhPrefetchUrls`, which returns a neighbourhood.
  useAudioPrefetch(
    nextAbsolute !== null && isAyahNumberValid(nextAbsolute)
      ? shaykhAudioUrl(reciter, nextAbsolute)
      : null,
  );

  const nextSurah = nextStep?.surah ?? null;
  const nextAyah = nextStep?.ayah ?? null;

  const handleFinished = useCallback(() => {
    if (nextSurah === null || nextAyah === null) return;

    goToAyah(nextSurah, nextAyah);
  }, [goToAyah, nextAyah, nextSurah]);

  const audio = useAyahAudio({
    source: audioSource,
    autoRead,
    onFinished: handleFinished,
  });

  const stepTo = (target: AyahRef | null) => {
    if (target === null) return;

    goToAyah(target.surah, target.ayah);
  };

  const openMenuAction = (action: ReaderMenuAction) => {
    if (action === 'share') {
      const position = selectedAyah
        ? { page, surah: selectedAyah.surah, ayah: selectedAyah.ayah }
        : { page, surah: null, ayah: null };

      // A cancelled share and an unsupported browser both reject; neither is
      // an error the reader needs to see, so the promise is intentionally
      // swallowed rather than turning a dismissal into a modal.
      void Share.share({
        title: t('reader.menuShare'),
        message: buildQuranShareUrl(position),
      }).catch(() => undefined);

      return;
    }

    if (action === 'surah') {
      setSheet('surah');

      return;
    }

    if (action === 'edition') {
      setSheet('edition');

      return;
    }

    if (action === 'audio') {
      setSheet('audio');

      return;
    }

    setPanel(action);
    setSheet(null);
  };

  return (
    <ScreenView>
      {chromeVisible ? (
        <ReaderHeader
          surah={surah}
          ayahKey={ayahKey}
          page={page}
          editionName={chromeEdition?.name ?? null}
          onExit={exit}
          onOpenSurah={() => setSheet('surah')}
          onOpenEditions={() => setSheet('edition')}
          onOpenMenu={() => setSheet('menu')}
        />
      ) : null}

      <View className="flex-1">{body}</View>

      {chromeVisible && chromeEdition ? (
        <ReaderFooter
          page={page}
          firstPage={chromeEdition.firstPage}
          lastPage={chromeEdition.lastPage}
          onPrevious={turnBackward}
          onNext={turnForward}
        />
      ) : null}

      <SurahPickerSheet
        isPresented={sheet === 'surah'}
        surahs={surahs}
        currentSurah={surahNumber}
        onDismiss={() => setSheet(null)}
        onSelect={(surah) => {
          goToSurah(surah);
          setSheet(null);
        }}
      />

      <EditionPickerSheet
        isPresented={sheet === 'edition'}
        editions={editions}
        currentKey={edition?.key ?? storeEditionKey}
        onDismiss={() => setSheet(null)}
        onSelect={(editionKey) => {
          setRequestedEditionKey(editionKey);
          setSheet(null);
        }}
      />

      <ReaderMenuSheet
        isPresented={sheet === 'menu'}
        hasSelection={selectedAyah !== null}
        onDismiss={() => setSheet(null)}
        onSelect={openMenuAction}
      />

      <AudioSheet
        isPresented={sheet === 'audio'}
        selected={selectedAyah}
        surahName={surahName}
        reciters={ALL_READERS}
        reciterId={reciter.identifier}
        autoRead={autoRead}
        wrap={wrap}
        audio={audio}
        canStepPrevious={previousStep !== null}
        canStepNext={nextStep !== null}
        onDismiss={() => setSheet(null)}
        onReciterChange={setReciterId}
        onAutoReadChange={setAutoRead}
        onWrapChange={setWrap}
        onPrevious={() => stepTo(previousStep)}
        onNext={() => stepTo(nextStep)}
      />

      <AyahPanelSheet
        panel={panel}
        surah={selectedAyah?.surah ?? null}
        surahName={surahName}
        ayahKey={selectedAyah ? String(selectedAyah.ayah) : null}
        content={ayahContent}
        notes={{ namespace: notesNamespace, ayah: selectedAyah }}
        ayah={selectedAyah}
        onDismiss={() => setPanel(null)}
      />
    </ScreenView>
  );
}

type ReaderBodyProps = {
  editions: Readonly<Record<string, QuranEdition>>;
  edition: QuranEdition;
  onToggleChrome: () => void;
};

function ReaderBody({ editions, edition, onToggleChrome }: ReaderBodyProps) {
  const bboxesQuery = useEditionBboxes(edition);
  const {
    attachEdition,
    switchEdition,
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
  const currentEditionKey = useReaderEditionKey();

  const editionBboxes: EditionBboxes | null =
    bboxesQuery.state.status === 'ready' ? bboxesQuery.state.data : null;

  // Attaching writes to the store; depending on the query *result* (a new
  // object every render) instead of its data would re-run this on every write.
  //
  // Two cases, one effect: the same edition (boot or a refetch) attaches and
  // keeps the current page/selection, while a different edition is a switch and
  // clears the selection. `switchEdition` clamps the page into the new range.
  useEffect(() => {
    if (!editionBboxes) return;

    if (currentEditionKey === null || currentEditionKey === edition.key) {
      attachEdition(editions, editionBboxes);

      return;
    }

    switchEdition(editions, editionBboxes, edition.key);
  }, [
    attachEdition,
    currentEditionKey,
    edition.key,
    editionBboxes,
    editions,
    switchEdition,
  ]);

  usePagePrefetch(edition, page);

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

  // One tap, one outcome. A tap on a margin clears a selected ayah; only when
  // nothing is selected does it toggle chrome. Doing both would mean the first
  // tap that hides the chrome also throws away the reader's selection.
  const handleBackdrop = useCallback(() => {
    if (ayahKey !== null) {
      clearSelection();

      return;
    }

    onToggleChrome();
  }, [ayahKey, clearSelection, onToggleChrome]);

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
        onBackdropPress={handleBackdrop}
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
