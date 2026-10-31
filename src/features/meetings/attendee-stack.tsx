import { View } from 'react-native';
import { ATTENDEE_LIST_CONFIG } from '@/core/config';
import type { Attendee } from '@/core/types';
import { Avatar } from '@/ui/avatar';
import { cn } from '@/ui/cn';
import { Text } from '@/ui/text';

/**
 * Overlapping attendee avatars.
 *
 * The web version revealed names through a tooltip. A phone has no hover, so
 * the count sits next to the stack and the names are listed in the expanded
 * details — visible labels instead of a long-press menu that hides the
 * information behind a gesture.
 *
 * Collapsing uses `-ms-2`, the logical start margin, so the stack overlaps
 * toward the inline end in both directions.
 */
export type AttendeeStackProps = {
  attendees: readonly Attendee[];
};

export function AttendeeStack({ attendees }: AttendeeStackProps) {
  if (attendees.length === 0) return null;

  const visible = attendees.slice(0, ATTENDEE_LIST_CONFIG.maxVisible);
  const hidden = attendees.length - visible.length;

  return (
    <View className="flex-row items-center">
      {visible.map((attendee, index) => (
        <View
          key={`${attendee.name}-${index}`}
          className={cn(
            'rounded-full border-2 border-card',
            index > 0 && '-ms-2',
          )}
        >
          <Avatar
            src={attendee.avatar}
            name={attendee.name}
            size={ATTENDEE_LIST_CONFIG.avatarSize}
          />
        </View>
      ))}

      {hidden > 0 ? (
        <View className="-ms-2 h-6 min-w-6 items-center justify-center rounded-full border-2 border-card bg-muted px-1">
          <Text variant="caption" tone="muted">
            {`+${hidden}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
