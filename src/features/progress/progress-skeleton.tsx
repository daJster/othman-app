import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Skeleton } from '@/ui/skeleton';

/**
 * The Progress page in its final geometry.
 *
 * The summary card, the section rail and the surah grid each have a stable
 * height, so the loading frame holds those three shapes instead of collapsing
 * to a spinner. When the rows arrive, nothing above the fold moves.
 */
export function ProgressSkeleton() {
  const { t } = useTranslation();

  return (
    <View
      testID="progress-loading"
      className="mx-auto w-full max-w-3xl gap-4 px-4 py-4"
      accessibilityRole="progressbar"
      accessibilityLabel={t('action.loading')}
    >
      <View className="gap-4 rounded-card border border-glass-edge bg-glass p-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 gap-2">
            <Skeleton className="h-3 w-32 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </View>
          <Skeleton className="h-3 w-28 rounded-full" />
        </View>
        <Skeleton className="h-2 w-full rounded-full" />
        <View className="flex-row gap-4">
          {[0, 1, 2].map((index) => (
            <View key={index} className="flex-1 gap-1">
              <Skeleton className="h-6 w-10 rounded-md" />
              <Skeleton className="h-3 w-20 rounded-full" />
            </View>
          ))}
        </View>
      </View>

      <View className="flex-row gap-2">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-11 w-24 rounded-full" />
        ))}
      </View>

      <View className="flex-row flex-wrap gap-1">
        {Array.from({ length: 48 }, (_, index) => (
          <Skeleton key={index} className="h-7 w-7 rounded-sm" />
        ))}
      </View>
    </View>
  );
}
