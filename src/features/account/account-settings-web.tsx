import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import type { IconName } from '@/core/config';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { Icon } from '@/ui/icon';
import { ListSectionHeader } from '@/ui/list-section-header';
import { Text } from '@/ui/text';

/**
 * Account settings rows — web only.
 *
 * `@expo/ui`'s `List` is the right choice on iOS/Android: it is a real SwiftUI
 * List / Compose LazyColumn with the platform's separators and pressed states.
 * Its web fallback, however, paints its row labels with a hard-coded dark
 * colour, which on a dark background measured 1.23:1. Rather than theme a
 * third-party fallback we do not control, the web path renders the same rows
 * from the app's own primitives so every colour comes from a token.
 *
 * Grammar follows the rest of the app: hairlines, not boxes; a leading glyph,
 * a label with one quiet supporting line, and a directional chevron. Rows are
 * 56px tall, which also clears the 44px tap target. Native flexbox flips `row`
 * for RTL; RN Web does not, so the row uses `flex-row-reverse` explicitly when
 * the document is RTL.
 */

type SettingsRowProps = {
  testID: string;
  icon: IconName;
  label: string;
  description?: string;
  onPress: () => void;
  isRTL: boolean;
  destructive?: boolean;
  showChevron?: boolean;
};

function SettingsRow({
  testID,
  icon,
  label,
  description,
  onPress,
  isRTL,
  destructive = false,
  showChevron = true,
}: SettingsRowProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'min-h-14 w-full flex-row items-center gap-3 border-b border-border py-3 active:opacity-70',
        FOCUS_RING,
        isRTL && 'flex-row-reverse',
      )}
    >
      <Icon name={icon} tone={destructive ? 'destructive' : 'muted'} />

      <View
        className="min-w-0 flex-1 gap-0.5"
        style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}
      >
        <Text
          variant="label"
          tone={destructive ? 'destructive' : 'default'}
          style={{ textAlign: isRTL ? 'right' : 'left' }}
        >
          {label}
        </Text>
        {description ? (
          <Text
            variant="caption"
            tone="muted"
            style={{ textAlign: isRTL ? 'right' : 'left' }}
          >
            {description}
          </Text>
        ) : null}
      </View>

      {showChevron ? (
        <Icon name={isRTL ? 'chevron-left' : 'chevron-right'} tone="muted" />
      ) : null}
    </Pressable>
  );
}

export type AccountSettingsWebProps = {
  isRTL: boolean;
  onProgress: () => void;
  onAbout: () => void;
  onSignOut: () => void;
};

export function AccountSettingsWeb({
  isRTL,
  onProgress,
  onAbout,
  onSignOut,
}: AccountSettingsWebProps) {
  const { t } = useTranslation();

  return (
    <View>
      <ListSectionHeader label={t('account.sections.settings')} inset={false} />

      <SettingsRow
        testID="account-progress-row"
        icon="chart-line"
        label={t('pages.account.progress.title')}
        description={t('pages.account.progress.subtitle')}
        onPress={onProgress}
        isRTL={isRTL}
      />

      <SettingsRow
        testID="account-about-row"
        icon="info"
        label={t('nav.about')}
        description={t('nav.aboutDesc')}
        onPress={onAbout}
        isRTL={isRTL}
      />

      <ListSectionHeader label={t('account.sections.session')} inset={false} />

      <SettingsRow
        testID="account-sign-out-row"
        icon="logout"
        label={t('account.signOut.confirm')}
        onPress={onSignOut}
        isRTL={isRTL}
        destructive
        showChevron={false}
      />
    </View>
  );
}
