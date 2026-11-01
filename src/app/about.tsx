import { Host, List, ListItem, RNHostView } from '@expo/ui';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useTranslation } from 'react-i18next';
import { useColorScheme, View } from 'react-native';
import { WEBSITE_URL } from '@/core/config';
import { TABS } from '@/features/navigation/route-registry';
import { useDirection } from '@/i18n';
import { openHttpsLink } from '@/platform/browser';
import { Icon } from '@/ui/icon';
import { ListSectionHeader } from '@/ui/list-section-header';
import { PageHeader } from '@/ui/page-header';
import { ScreenView } from '@/ui/screen';
import { Section } from '@/ui/section';
import { Text } from '@/ui/text';

/**
 * About.
 *
 * The legacy footer was four columns of marketing and of links to pages the web
 * app never built (`/terms`, `/privacy`, `/faq`, `/download`). On a phone a
 * footer is not a surface at all, so the content became one screen: what the app
 * is, the destinations that exist, the one external link that resolves, and the
 * copyright.
 *
 * The list rows are `@expo/ui` `List`/`ListItem`, like Account: real platform
 * rows on iOS/Android and a plain list on web. The prose blocks are hosted RN
 * views because `List` has no section API.
 *
 * Navigation to a tab uses `navigate`, not `push`: About is pushed on the root
 * stack above the tabs, and pushing a tab would stack a second copy of the app
 * instead of returning to the one already there.
 */
export default function AboutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isRTL } = useDirection();
  const scheme = useColorScheme();

  const title = t('nav.about');
  const chevron = isRTL ? 'chevron-left' : 'chevron-right';
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const year = new Date().getFullYear();

  return (
    <ScreenView>
      <Head>
        <title>{`${title} · ${t('app.name')}`}</title>
      </Head>

      <PageHeader
        title={title}
        onBack={() => router.back()}
        backTestID="about-back"
      />

      {/*
        `colorScheme` follows `Appearance`, which `ThemeProvider` keeps in sync
        with Uniwind, so the native list chrome matches the rest of the screen in
        both schemes.
      */}
      <Host style={{ flex: 1 }} colorScheme={scheme ?? 'dark'}>
        <List testID="about-list">
          <RNHostView matchContents={{ vertical: true }}>
            <View className="gap-3 px-4 pt-6 pb-2">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                <Icon name="book-open" size={28} tone="primary" />
              </View>

              <Section
                title={t('app.name')}
                description={t('app.tagline')}
                descriptionVariant="caption"
                level={2}
                className="gap-0.5"
              />

              <Text>{t('pages.about.description')}</Text>

              <Text variant="caption" tone="muted" testID="about-version">
                {t('pages.about.version', { version })}
              </Text>
            </View>
          </RNHostView>

          <ListSectionHeader label={t('pages.about.sections.explore')} />

          {TABS.map((route) => (
            <ListItem
              key={route.href}
              testID={`about-link:${route.href}`}
              leading={<Icon name={route.icon} />}
              trailing={<Icon name={chevron} tone="muted" />}
              supportingText={
                route.descriptionKey ? t(route.descriptionKey) : undefined
              }
              onPress={() => router.navigate(route.href)}
            >
              {t(route.titleKey)}
            </ListItem>
          ))}

          <ListSectionHeader label={t('pages.about.sections.resources')} />

          <ListItem
            testID="about-website"
            leading={<Icon name="external-link" />}
            trailing={<Icon name="external-link" tone="muted" />}
            supportingText={t('pages.about.websiteDesc')}
            onPress={() => void openHttpsLink(WEBSITE_URL)}
          >
            {t('pages.about.website')}
          </ListItem>

          <ListSectionHeader label={t('pages.about.sections.legal')} />

          <RNHostView matchContents={{ vertical: true }}>
            <View className="px-4 pt-2 pb-8">
              <Text variant="caption" tone="muted" testID="about-copyright">
                {t('pages.about.copyright', {
                  year,
                  name: t('app.name'),
                })}
              </Text>
            </View>
          </RNHostView>
        </List>
      </Host>
    </ScreenView>
  );
}
