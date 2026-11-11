import { useContext, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
} from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Button } from '../button';
import { Icon } from '../icon';
import { Text } from '../text';

/**
 * A side panel that keeps the page underneath visible.
 *
 * A drawer is for a secondary, self-contained task or a detail view — here it
 * is the full profile card, opened from the account header. It is deliberately
 * not the reader's bottom sheet: the reader's sheets are decisions about text,
 * while this is a reference surface that can stay open beside the page on a
 * wide screen.
 *
 * On phones it still slides in from the inline end and covers most of the
 * width, because a 420 px panel on a 375 px screen would be a sheet pretending
 * to be a drawer. The scrim dismisses, the close control dismisses, and Android
 * back dismisses through `onRequestClose`.
 */
export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  testID?: string;
  closeTestID?: string;
};

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  testID,
  closeTestID,
}: DrawerProps) {
  const { t } = useTranslation();
  // A component rendered outside the app shell (a test, a story) has no
  // provider. Zero insets are the correct fallback there; throwing would turn
  // an optional overlay into a render-time crash.
  const insets = useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(420, Math.max(300, width - 32));

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 flex-row bg-black/50">
        <Animated.View
          entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(120).reduceMotion(ReduceMotion.System)}
          className="flex-1"
        >
          <Pressable
            className="flex-1"
            accessibilityRole="button"
            accessibilityLabel={t('action.close')}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          testID={testID}
          entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(140).reduceMotion(ReduceMotion.System)}
          style={{ width: panelWidth }}
          className="h-full border-l border-border bg-background"
          accessibilityViewIsModal
        >
          <View
            className="flex-row items-center justify-between gap-3 border-b border-border px-4 py-3"
            style={{ paddingTop: insets.top + 12 }}
          >
            <Text variant="subtitle" className="flex-1" numberOfLines={1}>
              {title}
            </Text>
            <Button
              variant="ghost"
              size="icon"
              testID={closeTestID}
              accessibilityLabel={t('action.close')}
              onPress={onClose}
            >
              <Icon name="close" size={20} tone="muted" />
            </Button>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-5 p-4"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {footer ? (
            <View
              className="gap-2 border-t border-border px-4 pt-3"
              style={{ paddingBottom: insets.bottom + 12 }}
            >
              {footer}
            </View>
          ) : (
            <View style={{ paddingBottom: insets.bottom }} />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
