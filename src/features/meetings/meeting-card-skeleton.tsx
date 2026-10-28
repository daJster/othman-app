import { View } from 'react-native';
import { Card } from '@/ui/card';
import { Skeleton } from '@/ui/skeleton';

/**
 * Placeholder with the real card's silhouette.
 *
 * Three of these stand in for the list while the first read for a day is in
 * flight, so switching days does not collapse the screen to a spinner and then
 * push the calendar up when the rows arrive.
 */
export function MeetingCardSkeleton() {
  return (
    <Card testID="meeting-skeleton" className="gap-3">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-5 w-3/4" />
      <View className="gap-2">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </View>
      <View className="flex-row items-center gap-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </View>
      <Skeleton className="h-9 w-24" />
    </Card>
  );
}
