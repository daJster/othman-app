import { QueryClientContext } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { SurahMetadata } from '@/core/types';
import { useDirection } from '@/i18n';
import { Icon } from '@/ui/icon';
import { Pressable } from '@/ui/pressable';
import { Text } from '@/ui/text';
import { formatReaderNumber } from '../format';
import { pickStory } from '../story/pick-story';
import { STORIES, type Story } from '../story/stories';
import { useQuranCatalog } from '../use-quran-catalog';

/**
 * The landing page's suggestion from the text itself.
 *
 * Every other band on the page reports the reader's own progress; this one
 * offers a surah they were not already reading, with one note and a tap that
 * opens its first page. The facts — name, place, ayah count — come from the
 * catalog, so a suggestion cannot disagree with the mushaf. The mock supplies
 * only the note and the page.
 *
 * A catalog that has not loaded (or failed) still leaves a readable band: the
 * surah number and the note, never an empty title. A surah the catalog does not
 * know is not rendered at all, because the band would otherwise be naming a
 * place it cannot open.
 *
 * A band may be composed on a surface without the app's query tree; without a
 * client there is no catalog to read, which is the same not-loaded branch. That
 * keeps the module mountable on its own instead of throwing during render.
 */
export function StoryBand() {
  const client = useContext(QueryClientContext);
  const story = pickStory(STORIES, new Date());

  if (!client) {
    return <StoryBandView story={story} metadata={null} />;
  }

  return <StoryBandContent story={story} />;
}

function StoryBandContent({ story }: { story: Story }) {
  const catalog = useQuranCatalog();

  if (catalog.state.status !== 'ready') {
    return <StoryBandView story={story} metadata={null} />;
  }

  const metadata = catalog.state.data.surahs[String(story.surah)];

  if (!metadata) return null;

  return <StoryBandView story={story} metadata={metadata} />;
}

type StoryBandViewProps = {
  story: Story;
  /** `null` while the catalog is unavailable: render the number, not a gap. */
  metadata: SurahMetadata | null;
};

function StoryBandView({ story, metadata }: StoryBandViewProps) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const router = useRouter();

  const title =
    metadata === null
      ? t('pages.account.progress.surah', {
          number: formatReaderNumber(story.surah, language),
        })
      : language === 'ar'
        ? metadata.name
        : metadata.nameEnglish;

  const caption =
    metadata === null
      ? null
      : [
          t(
            metadata.location === 'makka'
              ? 'quran.story.place.makka'
              : 'quran.story.place.madina',
          ),
          t('quran.story.ayahs', {
            count: formatReaderNumber(metadata.ayahCount, language),
          }),
        ].join(' · ');

  const note = t(story.noteKey);

  const open = () => {
    router.push({
      pathname: '/reader/[page]',
      params: { page: String(story.page) },
    });
  };

  return (
    <Pressable
      testID="quran-story-band"
      accessibilityRole="button"
      accessibilityLabel={[title, caption, note].filter(Boolean).join(' · ')}
      onPress={open}
      className="border-b border-border py-7 active:opacity-70 md:py-8"
    >
      <Text variant="overline" tone="muted">
        {t('quran.landing.story')}
      </Text>

      <View className="mt-4 gap-1">
        <Text variant="title">{title}</Text>

        {caption === null ? null : (
          <Text variant="caption" tone="muted" className="tabular-nums">
            {caption}
          </Text>
        )}
      </View>

      <Text
        variant="body"
        tone="muted"
        className="mt-3 max-w-md leading-relaxed"
      >
        {note}
      </Text>

      <View className="mt-4 flex-row items-center gap-1">
        <Text variant="label" tone="primary">
          {t('quran.story.open')}
        </Text>
        <Icon name="chevron-right" size={16} tone="primary" />
      </View>
    </Pressable>
  );
}
