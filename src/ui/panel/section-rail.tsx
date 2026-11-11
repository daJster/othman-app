import { useTranslation } from 'react-i18next';
import { ScrollView, View, type ViewProps } from 'react-native';
import type { IconName } from '@/core/config';
import { cn } from '../cn';
import { FOCUS_RING } from '../focus';
import { Icon } from '../icon';
import { Pressable } from '../pressable';
import { Text } from '../text';

/**
 * A horizontal rail that switches the sections of one page.
 *
 * The rail is not navigation: it never changes the URL, and every section it
 * exposes belongs to the same screen and the same data. It exists because the
 * Progress page now carries three genuinely different views of one dataset —
 * an overview, the surah grid, and the review rhythm — and stacking them
 * vertically would make the reader scroll past two screens to reach the third.
 *
 * The selected segment is a filled secondary surface; peers stay quiet. The
 * icons are decorative and hidden from assistive tech; the label carries the
 * name and `selected` carries the state.
 */
export type SectionRailItem<T extends string> = {
  key: T;
  label: string;
  icon?: IconName;
};

export type SectionRailProps<T extends string> = Omit<ViewProps, 'children'> & {
  sections: readonly SectionRailItem<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
};

export function SectionRail<T extends string>({
  sections,
  value,
  onChange,
  className,
  testID,
  ...props
}: SectionRailProps<T>) {
  const { t } = useTranslation();

  return (
    <View
      testID={testID}
      className={cn('border-b border-border bg-background', className)}
      {...props}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="items-center gap-1 py-2"
        accessibilityRole="tablist"
        accessibilityLabel={t('action.sections')}
      >
        {sections.map((section) => {
          const selected = section.key === value;

          return (
            <Pressable
              key={section.key}
              testID={`section-rail:${section.key}`}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={section.label}
              onPress={() => onChange(section.key)}
              className={cn(
                'min-h-11 flex-row items-center gap-2 rounded-full px-4 active:opacity-70',
                selected ? 'bg-secondary' : 'bg-transparent',
                FOCUS_RING,
              )}
            >
              {section.icon ? (
                <Icon
                  name={section.icon}
                  size={16}
                  tone={selected ? 'foreground' : 'muted'}
                />
              ) : null}
              <Text
                variant="label"
                tone={selected ? 'default' : 'muted'}
                className={selected ? 'font-semibold' : undefined}
              >
                {section.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
