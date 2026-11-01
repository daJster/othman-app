import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View, type ViewProps } from 'react-native';
import { Button } from './button';
import { cn } from './cn';
import { HEADING_ROLE, headingAriaLevel, type HeadingLevel } from './heading';
import { Icon } from './icon';
import { Text } from './text';

/**
 * Screen states.
 *
 * `Loading`, `ErrorState` and `EmptyState` exist so no screen has to invent its
 * own — and, more importantly, so "empty" is never shown while the first load
 * is still in flight. A screen renders `Loading` until its first result
 * resolves, then either content, `EmptyState` (resolved, nothing there) or
 * `ErrorState` (failed, retryable).
 *
 * All three centre themselves in the space they are given: put them in
 * `ScreenView`, not in a `ScrollView` with a fixed height.
 *
 * Heading level is explicit because the same primitive serves two roles. An
 * inline state under a page header is level 2; a state that *is* the page
 * (404, /error) passes `headingLevel={1}`.
 */

/**
 * The shared centred shell. `flex-1` is deliberate: every state fills the space
 * it is given. The caller keeps ownership of the accessibility role and any
 * extra classes.
 */
function StateShell({
  className,
  children,
  ...props
}: ViewProps & { children: ReactNode }) {
  return (
    <View
      className={cn('flex-1 items-center justify-center gap-3 p-6', className)}
      {...props}
    >
      {children}
    </View>
  );
}

export type LoadingProps = Omit<ViewProps, 'children'> & {
  label?: string;
};

export function Loading({ label, className, ...props }: LoadingProps) {
  return (
    <StateShell
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      className={className}
      {...props}
    >
      <ActivityIndicator colorClassName="accent-primary" />
      {label ? (
        <Text variant="caption" className="text-center">
          {label}
        </Text>
      ) : null}
    </StateShell>
  );
}

export type ErrorStateProps = Omit<ViewProps, 'children'> & {
  title: string;
  description?: string;
  /** Retry button label; omit both this and `onRetry` for a static error. */
  onRetry?: () => void;
  /** Defaults to the translated `action.retry`. */
  retryLabel?: string;
  /** 1 when the state is the whole page, 2 when it sits under a page header. */
  headingLevel?: HeadingLevel;
  /** Primary action, e.g. “Back to home”. Rendered after the retry. */
  actionLabel?: string;
  onAction?: () => void;
};

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel,
  headingLevel = 2,
  actionLabel,
  onAction,
  className,
  ...props
}: ErrorStateProps) {
  const { t } = useTranslation();

  return (
    <StateShell accessibilityRole="alert" className={className} {...props}>
      <Icon name="alert-circle" size={32} tone="destructive" />
      <Text
        variant="subtitle"
        className="text-center"
        {...HEADING_ROLE}
        {...headingAriaLevel(headingLevel)}
      >
        {title}
      </Text>
      {description ? (
        <Text variant="caption" className="text-center">
          {description}
        </Text>
      ) : null}
      {onRetry ? (
        <Button
          variant="outline"
          size="sm"
          label={retryLabel ?? t('action.retry')}
          onPress={onRetry}
        />
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} />
      ) : null}
    </StateShell>
  );
}

export type EmptyStateProps = Omit<ViewProps, 'children'> & {
  title: string;
  description?: string;
  /** Optional call to action (e.g. "Add meeting"). */
  actionLabel?: string;
  onAction?: () => void;
  /** 1 when the state is the whole page, 2 when it sits under a page header. */
  headingLevel?: HeadingLevel;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  headingLevel = 2,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <StateShell className={className} {...props}>
      <Icon name="inbox" size={32} tone="muted" />
      <Text
        variant="subtitle"
        className="text-center"
        {...HEADING_ROLE}
        {...headingAriaLevel(headingLevel)}
      >
        {title}
      </Text>
      {description ? (
        <Text variant="caption" className="text-center">
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button size="sm" label={actionLabel} onPress={onAction} />
      ) : null}
    </StateShell>
  );
}
