import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/card';
import { Input } from '@/ui/input';
import { LanguageToggle } from '@/ui/language-toggle';
import { Text } from '@/ui/text';
import { ThemeToggle } from '@/ui/theme-toggle';

/**
 * Home tab — proof screen, temporary.
 *
 * Its job until P4.1 is to make the design system observable on iOS, Android
 * and web: tokens, spacing, `oklch` colours, `active:`/`rtl:` variants, both
 * languages side by side, and Arabic text in all three families. Swapping the
 * language should flip the layout, the typeface and every string without a
 * reload. Replaced by the real Home screen in P4.1.
 */
export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-6 p-4 pb-10">
        <View className="gap-1">
          <Text variant="title">{t('app.name')}</Text>
          <Text variant="label" tone="muted">
            {t('app.tagline')}
          </Text>
        </View>

        <Card>
          <CardHeader>
            <CardTitle>{t('language.title')}</CardTitle>
            <CardDescription>{t('nav.toggleLanguage')}</CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageToggle />
            <ThemeToggle />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('label.email')}</CardTitle>
            <CardDescription>{t('nav.meetingsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder={t('label.email')}
              keyboardType="email-address"
            />
            <Input placeholder={t('label.password')} secureTextEntry />
            <Text variant="caption" tone="muted">
              {t('meeting.organizedBy', { name: t('app.name') })}
            </Text>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('nav.quranFull')}</CardTitle>
            <CardDescription>{t('nav.quranDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Text family="quran" className="text-[28px] leading-relaxed">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </Text>
            <Text variant="caption" tone="muted">
              {t('state.emptyDescription')}
            </Text>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
