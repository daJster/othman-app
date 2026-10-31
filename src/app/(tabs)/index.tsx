import Head from 'expo-router/head';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { FeatureCard } from '@/features/home/feature-card';
import { HOME_LINKS } from '@/features/home/feature-links';
import { Hero } from '@/features/home/hero';
import { VerseCard } from '@/features/home/verse-card';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/ui/button';
import { Screen } from '@/ui/screen';
import { Text } from '@/ui/text';

/**
 * Home tab.
 *
 * A pure composition: hero, the featured verse, and the destinations that
 * actually exist. The legacy page also advertised tafsir, search and bookmarks,
 * none of which this app ships — claims for unbuilt features were removed
 * rather than greyed out, because a disabled card is still a promise.
 *
 * Padding lives on the inner sections (`p-0` on the scroll container) so the
 * hero can bleed to the screen edges while every text row keeps its 16 px
 * gutter. `Screen` owns automatic top-inset adjustment, so the hero is not
 * under the status bar.
 *
 * No data and therefore no loading state: the verse is static content, not a
 * server read. The first network-backed section on this screen will bring the
 * `Loading`/`ErrorState`/`EmptyState` contract with it.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();

  return (
    <Screen contentContainerClassName="gap-0 p-0">
      <Head>
        <title>{t('app.name')}</title>
      </Head>

      <Hero
        opening={t('home.hero.opening')}
        title={t('app.name')}
        tagline={t('app.tagline')}
      />

      <View className="gap-6 px-4 pt-6 pb-10">
        <VerseCard
          title={t('home.verse.title')}
          text={t('home.verse.text')}
          reference={t('home.verse.reference')}
        />

        <View className="gap-3">
          <Text variant="heading">{t('home.explore.title')}</Text>
          {!user ? (
            <Button
              variant="secondary"
              size="lg"
              label={t('action.signIn')}
              onPress={() => router.push('/auth/sign-in')}
              testID="home-sign-in"
            />
          ) : null}
          {HOME_LINKS.map((route) => (
            <FeatureCard
              key={route.href}
              href={route.href}
              icon={route.icon}
              title={t(route.titleKey)}
              description={t(route.descriptionKey)}
            />
          ))}
        </View>
      </View>
    </Screen>
  );
}
