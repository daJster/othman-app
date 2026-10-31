import { View } from 'react-native';
import { Text } from '@/ui/text';

/**
 * Featured verse as a quiet reading band, not a card.
 *
 * The home page's one piece of scripture should feel like a page margin, not a
 * product tile. A pair of hairlines, a brass label and a generous reading
 * measure do the work; the text uses `family="auto"` so Arabic gets Naskh and
 * English gets the UI face rather than a Quran face with no Latin glyphs.
 */
export type VerseCardProps = {
  title: string;
  text: string;
  reference: string;
};

export function VerseCard({ title, text, reference }: VerseCardProps) {
  return (
    <View className="border-y border-border py-8 md:py-10">
      <Text
        variant="overline"
        className="text-center tracking-[0.3em] text-brass"
      >
        {title}
      </Text>
      <Text className="mt-4 text-center text-2xl leading-relaxed md:text-3xl">
        {text}
      </Text>
      <Text variant="caption" tone="muted" className="mt-3 text-center">
        {reference}
      </Text>
    </View>
  );
}
