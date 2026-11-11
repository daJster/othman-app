import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useDeferredValue, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import {
  bandOf,
  type SurahProgress,
  type SurahProgressBand,
} from '@/core/domain/progress/surah-progress';
import { ProgressSummary } from '@/features/progress/progress-summary';
import { RequireAuth } from '@/features/auth/require-auth';
import {
  RecentReviews,
  ReviewTrendPanel,
  ReviewWeekPanel,
} from '@/features/progress/progress-activity-panels';
import { ProgressLegend } from '@/features/progress/progress-legend';
import { ProgressMilestones } from '@/features/progress/progress-milestones';
import { ProgressSkeleton } from '@/features/progress/progress-skeleton';
import { SurahDetailSheet } from '@/features/progress/surah-detail-sheet';
import { SurahHeatmap } from '@/features/progress/surah-heatmap';
import { useHideEmptyProgress } from '@/features/progress/use-hide-empty';
import { useSurahProgress } from '@/features/progress/use-surah-progress';
import {
  formatNumber,
  normalizeSearchDigits,
} from '@/features/progress/progress-format';
import { bandLabelKey } from '@/features/progress/surah-band';
import { useDirection } from '@/i18n';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { Icon } from '@/ui/icon';
import { Page } from '@/ui/page';
import { PageHeader } from '@/ui/page-header';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  SectionRail,
  SearchBar,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/ui/panel';
import { Pressable } from '@/ui/pressable';
import { Screen, ScreenView } from '@/ui/screen';
import { Section } from '@/ui/section';
import { ErrorState } from '@/ui/states';
import { Text } from '@/ui/text';

/**
 * Memorisation progress.
 *
 * Pushed from the account tab, so it owns a back control — the root stack hides
 * headers everywhere and builds one per screen. The four states (loading,
 * error, empty, ready) keep the header mounted so the user can always leave;
 * only the body swaps.
 *
 * The ready state is split into three sections on a `SectionRail`:
 *
 *  - **Overview** keeps the original composition — the summary, the milestone
 *    row and the full surah grid — so the page still opens on its subject;
 *  - **Surahs** is the same grid with search, band filters and the
 *    "hide not-started" switch, for when 114 cells become a lookup;
 *  - **Activity** turns the `lastReviewed` dates into a week strip, a review
 *    trend and a short list of recent surahs.
 *
 * All three read the same rows and the same detail sheet, so switching views
 * never refetches and a selection cannot point at a row the grid is no longer
 * showing.
 *
 * Selection is a `surahNumber`, not a row: the sheet reads the row from the
 * same array the grid draws, so a refetch cannot leave the sheet showing a
 * value the grid no longer displays.
 */
type ProgressSection = 'overview' | 'surahs' | 'activity';
type BandFilter = 'all' | SurahProgressBand;

/** Stable identity so the filter memo does not re-run on every render. */
const EMPTY_ROWS: readonly SurahProgress[] = [];

export default function ProgressScreen() {
  return (
    <RequireAuth>
      <ProgressContent />
    </RequireAuth>
  );
}

function ProgressContent() {
  const { t } = useTranslation();
  const { language } = useDirection();
  const router = useRouter();
  const { state } = useSurahProgress();
  const { hideEmpty, setHideEmpty } = useHideEmptyProgress();
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [section, setSection] = useState<ProgressSection>('overview');
  const [search, setSearch] = useState('');
  const [band, setBand] = useState<BandFilter>('all');
  const [legendOpen, setLegendOpen] = useState(false);

  const title = t('pages.account.progress.title');

  const rows = state.status === 'ready' ? state.data : EMPTY_ROWS;
  const selectedRow =
    rows.find((row) => row.surahNumber === selectedSurah) ?? null;

  const deferredSearch = useDeferredValue(search);
  const visibleRows = useMemo(() => {
    const query = normalizeSearchDigits(deferredSearch.trim().toLowerCase());

    return rows.filter((row) => {
      const rowBand = bandOf(row.percent);
      if (band !== 'all' && rowBand !== band) return false;
      if (hideEmpty && row.percent === 0) return false;
      if (!query) return true;

      const bandLabel = t(bandLabelKey(rowBand)).toLowerCase().trim();

      return (
        String(row.surahNumber).includes(query) ||
        formatNumber(row.surahNumber, language).includes(query) ||
        bandLabel.includes(query)
      );
    });
  }, [band, deferredSearch, hideEmpty, language, rows, t]);

  const clearFilters = () => {
    setSearch('');
    setBand('all');
    setHideEmpty(false);
  };

  let body: ReactNode;

  if (state.status === 'pending') {
    body = <ProgressSkeleton />;
  } else if (state.status === 'error') {
    body = (
      <ErrorState
        title={t('state.errorTitle')}
        description={t('state.errorDescription')}
        onRetry={state.retry}
      />
    );
  } else if (state.status === 'empty') {
    body = (
      <EmptyState
        title={t('pages.account.progress.empty')}
        description={t('pages.account.progress.emptyDescription')}
        actionLabel={t('pages.account.progress.emptyAction')}
        onAction={() => router.push('/quran')}
      />
    );
  } else {
    body = (
      // Remount per section: the rail switches views in place, and keeping the
      // previous scroll offset would drop the reader halfway down the next one.
      <Screen key={section} contentContainerClassName="gap-0 p-0">
        {section === 'overview' ? (
          <Page width="default" className="gap-6 py-4 pb-8">
            <ProgressSummary rows={state.data} />
            <ProgressMilestones rows={state.data} />
            <SurahGrid
              rows={state.data}
              selectedSurah={selectedSurah}
              onSelect={setSelectedSurah}
              description={t('pages.account.progress.gridDescription')}
              onOpenLegend={() => setLegendOpen(true)}
            />
          </Page>
        ) : null}

        {section === 'surahs' ? (
          <Page width="default" className="gap-5 py-4 pb-8">
            <Card className="gap-3">
              <SearchBar
                testID="progress-search"
                inputTestID="progress-search-input"
                value={search}
                onChangeText={setSearch}
                placeholder={t('pages.account.progress.search.placeholder')}
                accessibilityLabel={t(
                  'pages.account.progress.search.placeholder',
                )}
                clearAccessibilityLabel={t(
                  'pages.account.progress.search.clear',
                )}
              />

              <View className="flex-row flex-wrap gap-2">
                {BAND_FILTERS.map((option) => {
                  const selected = option.value === band;

                  return (
                    <Button
                      key={option.value}
                      testID={`progress-band:${option.value}`}
                      size="sm"
                      variant={selected ? 'secondary' : 'ghost'}
                      accessibilityState={{ selected }}
                      label={t(option.labelKey)}
                      onPress={() => setBand(option.value)}
                      className="border border-border"
                    />
                  );
                })}
              </View>

              <View className="flex-row items-center gap-3 border-t border-border pt-3">
                <View className="flex-1 gap-0.5">
                  <Text variant="label">
                    {t('pages.account.progress.filters.hideEmpty')}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {t('pages.account.progress.filters.hideEmptyHint')}
                  </Text>
                </View>
                <Switch
                  testID="progress-hide-empty"
                  checked={hideEmpty}
                  onCheckedChange={setHideEmpty}
                  hitSlop={12}
                  accessibilityLabel={t(
                    'pages.account.progress.filters.hideEmpty',
                  )}
                />
              </View>
            </Card>

            <SurahGrid
              rows={visibleRows}
              selectedSurah={selectedSurah}
              onSelect={setSelectedSurah}
              description={t('pages.account.progress.filters.showing', {
                shown: visibleRows.length,
                total: rows.length,
              })}
              onOpenLegend={() => setLegendOpen(true)}
              empty={{
                title: t('pages.account.progress.filters.emptyTitle'),
                description: t(
                  'pages.account.progress.filters.emptyDescription',
                ),
                actionLabel: t('pages.account.progress.filters.clear'),
                onAction: clearFilters,
              }}
            />
          </Page>
        ) : null}

        {section === 'activity' ? (
          <Page width="default" className="gap-5 py-4 pb-8">
            <ReviewWeekPanel rows={state.data} />
            <ReviewTrendPanel rows={state.data} />
            <RecentReviews
              rows={state.data}
              onSelect={setSelectedSurah}
              onViewAll={() => setSection('surahs')}
            />
          </Page>
        ) : null}
      </Screen>
    );
  }

  return (
    <ScreenView>
      <Head>
        <title>{`${title} · ${t('app.name')}`}</title>
      </Head>

      <PageHeader
        title={title}
        onBack={() => router.back()}
        backTestID="progress-back"
      />

      {state.status === 'ready' ? (
        <SectionRail
          testID="progress-sections"
          value={section}
          onChange={setSection}
          sections={SECTIONS.map((item) => ({
            key: item.key,
            label: t(item.labelKey),
            icon: item.icon,
          }))}
          className="mx-auto w-full max-w-3xl px-4"
        />
      ) : null}

      {body}

      {state.status === 'ready' ? (
        <SurahDetailSheet
          row={selectedRow}
          onClose={() => setSelectedSurah(null)}
        />
      ) : null}

      <LegendDialog open={legendOpen} onOpenChange={setLegendOpen} />
    </ScreenView>
  );
}

type SurahGridProps = {
  rows: readonly SurahProgress[];
  selectedSurah: number | null;
  onSelect: (surahNumber: number) => void;
  description: string;
  onOpenLegend: () => void;
  empty?: {
    title: string;
    description: string;
    actionLabel: string;
    onAction: () => void;
  };
};

function SurahGrid({
  rows,
  selectedSurah,
  onSelect,
  description,
  onOpenLegend,
  empty,
}: SurahGridProps) {
  const { t } = useTranslation();

  return (
    <View className="gap-3">
      <Section
        title={t('pages.account.progress.gridTitle')}
        titleVariant="label"
        level={2}
        titleTestID="progress-grid-title"
        description={description}
        descriptionVariant="caption"
        className="gap-0.5"
      />

      {rows.length === 0 && empty ? (
        <EmptyState
          testID="progress-filter-empty"
          title={empty.title}
          description={empty.description}
          actionLabel={empty.actionLabel}
          onAction={empty.onAction}
        />
      ) : (
        <SurahHeatmap
          rows={rows}
          selectedSurah={selectedSurah}
          onSelect={onSelect}
        />
      )}

      <View className="flex-row items-center justify-center gap-3">
        <ProgressLegend
          lessLabel={t('pages.account.progress.legend.less')}
          moreLabel={t('pages.account.progress.legend.more')}
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <Pressable
              testID="progress-legend-info"
              accessibilityRole="button"
              accessibilityLabel={t('pages.account.progress.legend.open')}
              onPress={onOpenLegend}
              className={cn(
                'h-11 w-11 items-center justify-center rounded-full active:opacity-70',
                FOCUS_RING,
              )}
            >
              <Icon name="info" size={16} tone="muted" />
            </Pressable>
          </TooltipTrigger>
          <TooltipContent>
            <Text variant="caption">
              {t('pages.account.progress.legend.hint')}
            </Text>
          </TooltipContent>
        </Tooltip>
      </View>
    </View>
  );
}

function LegendDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent testID="progress-legend-dialog" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('pages.account.progress.legend.title')}</DialogTitle>
          <DialogDescription>
            {t('pages.account.progress.legend.body')}
          </DialogDescription>
        </DialogHeader>

        <View className="gap-3">
          {BAND_HELP.map((item) => (
            <View key={item.band} className="flex-row items-start gap-3">
              <View
                className={`mt-0.5 h-8 w-8 rounded-md border border-border ${item.swatch}`}
              />
              <View className="flex-1 gap-0.5">
                <Text variant="label">{t(bandLabelKey(item.band))}</Text>
                <Text variant="caption" tone="muted">
                  {t(item.descriptionKey)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <DialogFooter>
          <Button
            label={t('action.close')}
            onPress={() => onOpenChange(false)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const SECTIONS = [
  {
    key: 'overview',
    labelKey: 'pages.account.progress.sections.overview',
    icon: 'chart-line',
  },
  {
    key: 'surahs',
    labelKey: 'pages.account.progress.sections.surahs',
    icon: 'layers',
  },
  {
    key: 'activity',
    labelKey: 'pages.account.progress.sections.activity',
    icon: 'calendar',
  },
] as const satisfies readonly {
  key: ProgressSection;
  labelKey: string;
  icon: 'chart-line' | 'layers' | 'calendar';
}[];

const BAND_FILTERS = [
  { value: 'all', labelKey: 'pages.account.progress.filters.all' },
  {
    value: 'memorised',
    labelKey: 'pages.account.progress.band.memorised',
  },
  {
    value: 'in-progress',
    labelKey: 'pages.account.progress.band.inProgress',
  },
  {
    value: 'not-started',
    labelKey: 'pages.account.progress.band.notStarted',
  },
] as const satisfies readonly {
  value: BandFilter;
  labelKey: string;
}[];

const BAND_HELP = [
  {
    band: 'memorised',
    swatch: 'bg-primary',
    descriptionKey: 'pages.account.progress.legend.memorised',
  },
  {
    band: 'in-progress',
    swatch: 'bg-primary/40',
    descriptionKey: 'pages.account.progress.legend.inProgress',
  },
  {
    band: 'not-started',
    swatch: 'bg-muted',
    descriptionKey: 'pages.account.progress.legend.notStarted',
  },
] as const satisfies readonly {
  band: SurahProgressBand;
  swatch: string;
  descriptionKey: string;
}[];
