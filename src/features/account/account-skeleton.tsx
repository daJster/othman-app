import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
import { Skeleton } from '@/ui/skeleton';
import { Text } from '@/ui/text';

/**
 * The Account page before its profile read resolves.
 *
 * A page-shaped skeleton is better than a centred spinner here because the
 * account screen has a fixed composition: avatar, identity, three steps, the
 * snapshot, then rows. Holding that geometry means the content lands where the
 * eye was already waiting instead of pushing the page down.
 *
 * The bars are inert (`Skeleton` hides itself from assistive tech) and the
 * outer view owns one progress label, so a screen reader hears "Loading"
 * once, not fourteen times.
 */
export function AccountSkeleton() {
  const { t } = useTranslation();

  return (
    <View
      testID="account-loading"
      className="flex-1"
      accessibilityRole="progressbar"
      accessibilityLabel={t('action.loading')}
    >
      <View className="mx-auto w-full max-w-3xl gap-4 px-4 py-6">
        <Skeleton className="h-4 w-24 rounded-full" />

        <View className="flex-row items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-5 w-40 rounded-full" />
            <Skeleton className="h-3 w-52 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </View>
          <Skeleton className="h-11 w-16 rounded-md" />
        </View>

        <View className="flex-row justify-between gap-2 pt-2">
          {[0, 1, 2].map((index) => (
            <View key={index} className="flex-1 items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-3 w-16 rounded-full" />
            </View>
          ))}
        </View>

        <View className="gap-2 pt-2">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-2 w-full rounded-full" />
        </View>

        {[0, 1, 2].map((index) => (
          <View
            key={index}
            className="flex-row items-center gap-3 border-b border-glass-edge py-3"
          >
            <Skeleton className="h-5 w-5 rounded-md" />
            <View className="flex-1 gap-1.5">
              <Skeleton className="h-4 w-32 rounded-full" />
              <Skeleton className="h-3 w-48 rounded-full" />
            </View>
          </View>
        ))}

        {Platform.OS === 'web' ? (
          <Text variant="caption" tone="muted" className="sr-only">
            {t('action.loading')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
