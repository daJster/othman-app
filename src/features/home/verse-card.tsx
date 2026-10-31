import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Text } from '@/ui/text';

/**
 * Featured verse.
 *
 * The text uses `family="auto"`, not the mushaf face: `en` shows an English
 * translation, and Amiri Quran has no Latin glyphs, so forcing it would hand
 * the string to a fallback family the app does not control. In Arabic the auto
 * family is Noto Naskh, which renders the diacritics correctly.
 */
export type VerseCardProps = {
  title: string;
  text: string;
  reference: string;
};

export function VerseCard({ title, text, reference }: VerseCardProps) {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="gap-2">
        <Text className="text-center text-xl leading-relaxed">{text}</Text>
        <Text variant="caption" tone="muted" className="text-center">
          {reference}
        </Text>
      </CardContent>
    </Card>
  );
}
