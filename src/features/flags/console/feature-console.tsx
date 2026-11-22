import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { api, backendMessageKey, useApiMutation, useApiQuery } from '@/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDirection } from '@/i18n';
import { numberLocale } from '@/i18n/format';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Page } from '@/ui/page';
import { PageHeader } from '@/ui/page-header';
import { useToast } from '@/ui/panel';
import { Pressable } from '@/ui/pressable';
import { Screen, ScreenView } from '@/ui/screen';
import { ErrorState, Loading } from '@/ui/states';
import { Text } from '@/ui/text';
import { useFeatures } from '../provider';
import {
  FEATURE_KEYS,
  FEATURE_NODES,
  featureChain,
  isEditable,
  labelKey,
  levelKey,
  STATE_COPY,
  type FeatureKey,
  type FeatureNode,
} from '../registry';
import type { FeatureOverride, FeatureState } from '../types';
import {
  DEFAULT_DRAFT,
  draftChange,
  draftFromOverride,
  sameDraft,
  type FeatureDraft,
} from './draft';
import { FeatureEditorDialog } from './feature-editor-dialog';

/**
 * The switchboard.
 *
 * Superadmin-only, and the only screen that talks about features instead of
 * using them. It edits a *staged* copy: a row is a decision, the header is the
 * commit, and leaving the page without saving changes nothing. That matters
 * when the switch is about to turn off a school's calendar.
 *
 * The tree is the registry, not a second list. Order, labels, depth and
 * inheritance all come from `features/flags/registry.ts`, so adding a gate in
 * code makes it appear here with no further wiring.
 */

type Group = {
  node: FeatureNode;
  rows: FeatureNode[];
};

function buildGroups(): Group[] {
  const groups: Group[] = [];

  for (const key of FEATURE_KEYS) {
    const node = FEATURE_NODES[key];

    if (node.level === 'app' || node.level === 'area') {
      groups.push({ node, rows: [] });
      continue;
    }

    // Every non-root node belongs to the first key under `app`.
    const root = featureChain(key)[1] ?? 'app';
    const group = groups.find((candidate) => candidate.node.key === root);

    group?.rows.push(node);
  }

  return groups;
}

const GROUPS = buildGroups();

const STATE_BADGE: Record<
  FeatureState,
  'positive' | 'info' | 'secondary' | 'destructive'
> = {
  on: 'positive',
  'read-only': 'info',
  maintenance: 'secondary',
  off: 'destructive',
};

export function FeatureConsole() {
  const { t } = useTranslation();
  const { language } = useDirection();
  const router = useRouter();
  const toast = useToast();
  const flags = useFeatures();
  const query = useApiQuery(api.config.features);
  const save = useApiMutation(api.config.saveFeatures);
  const [staged, setStaged] = useState<
    Partial<Record<FeatureKey, FeatureDraft>>
  >({});
  const [editing, setEditing] = useState<FeatureKey | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const config = query.data ?? flags.config;
  const stagedKeys = Object.keys(staged) as FeatureKey[];
  const pending = save.isPending;

  const stage = (key: FeatureKey, draft: FeatureDraft) => {
    const base = draftFromOverride(config.flags[key]);

    setStaged((current) => {
      const next = { ...current };

      if (sameDraft(draft, base)) {
        delete next[key];
      } else {
        next[key] = draft;
      }

      return next;
    });
    setEditing(null);
  };

  const commit = (
    changes: ReturnType<typeof draftChange>[],
    onDone?: () => void,
  ) => {
    save.mutate(changes, {
      onSuccess: () => {
        setStaged({});
        onDone?.();
        toast.show(t('features.console.saved'), { tone: 'success' });
      },
      onError: (error) =>
        toast.show(t(backendMessageKey(error)), { tone: 'error' }),
    });
  };

  const commitStaged = () => {
    commit(stagedKeys.map((key) => draftChange(key, staged[key]!)));
  };

  const overriddenKeys = (Object.keys(config.flags) as FeatureKey[]).filter(
    (key) => isEditable(FEATURE_NODES[key]),
  );

  const commitReset = () => {
    commit(
      overriddenKeys.map((key) => draftChange(key, DEFAULT_DRAFT)),
      () => setResetOpen(false),
    );
  };

  const stamp = config.updatedAt
    ? new Intl.DateTimeFormat(numberLocale(language), {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(config.updatedAt))
    : null;
  const author = config.updatedBy ?? t('features.console.changedBySystem');

  if (query.isPending && !query.data) {
    return (
      <ScreenView>
        <Loading label={t('action.loading')} />
      </ScreenView>
    );
  }

  if (query.isError && !query.data) {
    return (
      <ScreenView>
        <ErrorState
          title={t('features.console.errorTitle')}
          description={t(backendMessageKey(query.error))}
          retryLabel={t('features.console.retry')}
          onRetry={query.refetch}
          actionLabel={t('action.back')}
          onAction={() => router.back()}
        />
      </ScreenView>
    );
  }

  return (
    <ScreenView className="flex-1">
      <PageHeader
        title={t('features.console.title')}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace('/')
        }
        end={
          <Button
            size="sm"
            label={
              pending
                ? t('features.console.saving')
                : t('features.console.save')
            }
            disabled={stagedKeys.length === 0 || pending}
            onPress={commitStaged}
            testID="features-save"
          />
        }
      />

      <Screen contentContainerClassName="gap-4 p-gutter pb-section">
        <Page className="gap-3">
          <Text variant="body" className="leading-relaxed">
            {t('features.console.description')}
          </Text>

          <View className="flex-row items-start gap-2 rounded-lg border border-brass/30 bg-secondary p-3">
            <Icon name="info" size={16} tone="brass" />
            <Text variant="caption" tone="muted" className="min-w-0 flex-1">
              {t('features.console.global')}
            </Text>
          </View>

          <Text variant="caption" tone="muted">
            {stamp
              ? t('features.console.updated', { when: stamp, who: author })
              : t('features.console.never')}
          </Text>

          {stagedKeys.length > 0 ? (
            <View
              className="flex-row items-center gap-3 rounded-lg border border-brass/60 bg-secondary px-3 py-2"
              testID="features-staged-bar"
            >
              <View className="h-2 w-2 rounded-full bg-brass" />
              <Text variant="label" className="min-w-0 flex-1">
                {t('features.console.staged', { count: stagedKeys.length })}
              </Text>
              <Button
                variant="link"
                size="sm"
                label={t('features.console.discard')}
                onPress={() => setStaged({})}
              />
            </View>
          ) : null}

          {GROUPS.map((group) => (
            <View key={group.node.key} className="gap-2">
              <Text variant="overline" className="px-1 pt-2 text-brass-ink">
                {t(labelKey(group.node.key))}
              </Text>

              <View className="overflow-hidden rounded-lg border border-border">
                <FeatureRow
                  node={group.node}
                  override={config.flags[group.node.key]}
                  draft={staged[group.node.key]}
                  onPress={() => setEditing(group.node.key)}
                />

                {group.rows.map((row) => (
                  <FeatureRow
                    key={row.key}
                    node={row}
                    override={config.flags[row.key]}
                    draft={staged[row.key]}
                    onPress={() => setEditing(row.key)}
                  />
                ))}
              </View>
            </View>
          ))}

          <View className="gap-1 border-t border-border pt-4">
            <Text variant="caption" tone="muted">
              {t('features.console.lockedHint')}
            </Text>
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              label={t('features.console.resetAll')}
              disabled={overriddenKeys.length === 0 || pending}
              onPress={() => setResetOpen(true)}
              testID="features-reset-all"
            />
          </View>
        </Page>
      </Screen>

      {editing ? (
        <FeatureEditorDialog
          key={editing}
          feature={editing}
          staged={staged[editing]}
          onApply={(draft) => stage(editing, draft)}
          onClose={() => setEditing(null)}
        />
      ) : null}

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('features.console.resetAllTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('features.console.resetAllBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setResetOpen(false)}>
              <Text>{t('action.cancel')}</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={commitReset} disabled={pending}>
              <Text>{t('features.console.resetAll')}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScreenView>
  );
}

function FeatureRow({
  node,
  override,
  draft,
  onPress,
}: {
  node: FeatureNode;
  override: FeatureOverride | undefined;
  draft: FeatureDraft | undefined;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const flags = useFeatures();
  const locked = !isEditable(node);
  const display = draft ? draft.state : (override?.state ?? null);
  const state = display ?? 'on';
  const resolved = flags.resolved[node.key];

  return (
    <Pressable
      testID={`feature-row:${node.key}`}
      accessibilityRole="button"
      accessibilityLabel={t(labelKey(node.key))}
      accessibilityState={{ disabled: locked }}
      disabled={locked}
      onPress={onPress}
      className="min-h-14 flex-row items-center gap-3 border-b border-border px-3 py-2 active:bg-muted/40"
    >
      <Icon name={node.icon} size={18} tone="muted" />

      <View className="min-w-0 flex-1 gap-0.5">
        <Text variant="label" numberOfLines={1}>
          {t(labelKey(node.key))}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {t(levelKey(node.key))}
          {'  ·  '}
          {node.key}
        </Text>
        {resolved.inherited ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {t('features.console.inherited', {
              source: t(labelKey(resolved.source ?? node.key)),
            })}
          </Text>
        ) : null}
      </View>

      {draft ? <View className="h-2 w-2 rounded-full bg-brass" /> : null}

      <Badge
        variant={locked ? 'outline' : display ? STATE_BADGE[state] : 'neutral'}
        label={
          locked
            ? t('features.console.alwaysOn')
            : display
              ? t(STATE_COPY[state])
              : t('features.console.default')
        }
      />

      {locked ? null : <Icon name="chevron-right" size={16} tone="muted" />}
    </Pressable>
  );
}
