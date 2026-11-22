import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { ReactNode } from 'react';
import { cn } from '@/ui/cn';
import { Icon } from '@/ui/icon';
import { Button } from '@/ui/button';
import { Text } from '@/ui/text';
import { ScreenView } from '@/ui/screen';
import { useFeatures } from './provider';
import { descriptionKey, labelKey, type FeatureKey } from './registry';
import type { FeatureState } from './types';

/**
 * The two enforcement primitives.
 *
 * `FeatureGate` is for a control inside a page (a button, a row, a section):
 * it renders children only when the capability is usable. `FeatureNotice` is
 * for a whole screen and is what the root gate paints over a disabled route.
 *
 * Neither decides policy. They read the resolved snapshot, so a gate can never
 * disagree with the tab bar or the server about what "off" means.
 */

export type FeatureGateProps = {
  feature: FeatureKey;
  /**
   * `write` (default) also requires the capability to be writable, which is how
   * a read-only area removes its create/edit/delete controls. `view` only asks
   * whether the feature is visible at all (links, rows, tabs).
   */
  mode?: 'write' | 'view';
  fallback?: ReactNode;
  children: ReactNode;
};

export function FeatureGate({
  feature,
  mode = 'write',
  fallback = null,
  children,
}: FeatureGateProps) {
  const flags = useFeatures();
  const view = flags.view(feature);
  const allowed = mode === 'write' ? view.writable : view.visible;

  return <>{allowed ? children : fallback}</>;
}

export type FeatureNoticeProps = {
  /** The feature that is unavailable; `null` means the app itself. */
  feature: FeatureKey | null;
  state: FeatureState;
  onRetry?: () => void;
  onHome?: () => void;
  /** Shown to superadmins only: the way back to the switchboard. */
  onControls?: () => void;
};

/**
 * What a disabled (or paused) page says.
 *
 * Three states, three sentences: `maintenance` promises a return, `off` does
 * not, `read-only` reassures that nothing was lost. All three name the surface,
 * because "the app is unavailable" over the Meetings tab reads like a lie.
 */
export function FeatureNotice({
  feature,
  state,
  onRetry,
  onHome,
  onControls,
}: FeatureNoticeProps) {
  const { t } = useTranslation();
  const surface = t(labelKey(feature ?? 'app'));
  const maintenance = state === 'maintenance';
  const readOnly = state === 'read-only';

  const title = maintenance
    ? t('features.notice.maintenance.title', { feature: surface })
    : readOnly
      ? t('features.notice.readOnly.title', { feature: surface })
      : t('features.notice.off.title', { feature: surface });

  const body = maintenance
    ? t('features.notice.maintenance.body')
    : readOnly
      ? t('features.notice.readOnly.body')
      : t('features.notice.off.body');

  return (
    <ScreenView className="items-center justify-center bg-background px-6">
      <View className="w-full max-w-md items-center gap-4">
        <View
          className={cn(
            'h-16 w-16 items-center justify-center rounded-full border',
            readOnly
              ? 'border-glass-edge bg-glass'
              : maintenance
                ? 'border-brass/40 bg-secondary'
                : 'border-destructive/30 bg-destructive/10',
          )}
        >
          <Icon
            name={
              readOnly ? 'eye' : maintenance ? 'alert-circle' : 'circle-slash'
            }
            size={28}
            tone={readOnly ? 'muted' : maintenance ? 'brass' : 'destructive'}
          />
        </View>

        <View className="items-center gap-2">
          <Text variant="caption" tone="muted" className="uppercase">
            {t('features.notice.eyebrow')}
          </Text>
          <Text variant="title" align="center">
            {title}
          </Text>
          <Text variant="caption" tone="muted" align="center">
            {body}
          </Text>
        </View>

        {feature ? (
          <Text variant="caption" tone="muted" align="center">
            {t(descriptionKey(feature))}
          </Text>
        ) : null}

        <View className="w-full gap-2 pt-1">
          {onRetry ? (
            <Button label={t('features.notice.retry')} onPress={onRetry} />
          ) : null}
          {onHome ? (
            <Button
              variant="outline"
              label={t('features.notice.home')}
              onPress={onHome}
            />
          ) : null}
          {onControls ? (
            <Button
              variant="link"
              size="sm"
              label={t('features.notice.controls')}
              onPress={onControls}
            />
          ) : null}
        </View>
      </View>
    </ScreenView>
  );
}

/**
 * The notice as a page-sized overlay.
 *
 * The navigator stays mounted underneath: returning from an overlay must not
 * rebuild navigation state, and the tab bar is covered by the same view so a
 * disabled area cannot be reached around the notice.
 */
export function FeatureOverlay(props: FeatureNoticeProps) {
  return (
    <View
      className="absolute inset-0 z-50 bg-background"
      style={{ elevation: 50 }}
      testID="feature-notice"
    >
      <FeatureNotice {...props} />
    </View>
  );
}

/**
 * A page that is a write surface first (`account/edit`, `admin/members/edit`).
 *
 * The root gate handles `off` and `maintenance`; this handles the one state the
 * root lets through: `read-only`. Rendering the form would offer a Save button
 * that the server refuses with a 503, so the page is replaced by the read-only
 * notice instead.
 */
export function FeatureScreen({
  feature,
  children,
}: {
  feature: FeatureKey;
  children: ReactNode;
}) {
  const flags = useFeatures();
  const state = flags.state(feature);

  if (flags.view(feature).writable) return <>{children}</>;

  return <FeatureNotice feature={feature} state={state} />;
}
