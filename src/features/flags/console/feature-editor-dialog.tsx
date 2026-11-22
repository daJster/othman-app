import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { cn } from '@/ui/cn';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import { Pressable } from '@/ui/pressable';
import { Text } from '@/ui/text';
import { useFeatures } from '../provider';
import {
  levelKey,
  STATE_COPY,
  STATE_HINT,
  labelKey,
  type FeatureKey,
} from '../registry';
import { FEATURE_STATES, type FeatureState } from '../types';
import { draftFromOverride, type FeatureDraft } from './draft';

/**
 * Editing one switch.
 *
 * A dialog, and a compact one: four states as a 2×2 grid with the selected
 * state's explanation underneath, instead of four tall rows. That is what keeps
 * Apply on screen without a nested scroll view — a scroll view inside a dialog
 * collapses to nothing on Android and hands its space to the footer.
 *
 * The editor keeps its own draft and only hands it back on Apply: dismissing it
 * must never move a global switch by accident.
 */
export type FeatureEditorDialogProps = {
  feature: FeatureKey;
  staged: FeatureDraft | undefined;
  onApply: (draft: FeatureDraft) => void;
  onClose: () => void;
};

export function FeatureEditorDialog({
  feature,
  staged,
  onApply,
  onClose,
}: FeatureEditorDialogProps) {
  const { t } = useTranslation();
  const flags = useFeatures();
  const [draft, setDraft] = useState<FeatureDraft>(
    staged ?? draftFromOverride(flags.config.flags[feature]),
  );

  const resolved = flags.resolved[feature];
  const overridden = Boolean(flags.config.flags[feature]);
  const selectedState = draft.state ?? 'on';

  return (
    <Dialog open onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent testID="feature-editor" className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t(labelKey(feature))}</DialogTitle>
          <DialogDescription>
            {t(`features.${feature}.description`)}
          </DialogDescription>
        </DialogHeader>

        <View className="flex-row items-center gap-2">
          <Badge variant="outline" label={t(levelKey(feature))} />
          <Text variant="caption" tone="muted">
            {feature}
          </Text>
        </View>

        <View className="gap-1">
          <View className="flex-row gap-1">
            {FEATURE_STATES.slice(0, 2).map((state) => (
              <StateChoice
                key={state}
                state={state}
                selected={selectedState === state}
                onPress={() => setDraft((current) => ({ ...current, state }))}
              />
            ))}
          </View>
          <View className="flex-row gap-1">
            {FEATURE_STATES.slice(2).map((state) => (
              <StateChoice
                key={state}
                state={state}
                selected={selectedState === state}
                onPress={() => setDraft((current) => ({ ...current, state }))}
              />
            ))}
          </View>
        </View>

        <View className="flex-row items-start gap-2">
          <Icon
            name={selectedState === 'on' ? 'check-circle' : 'info'}
            size={14}
            tone={selectedState === 'on' ? 'success' : 'muted'}
          />
          <Text variant="caption" tone="muted" className="min-w-0 flex-1">
            {t(STATE_HINT[selectedState])}
          </Text>
        </View>

        {resolved.inherited ? (
          <Text variant="caption" tone="muted">
            {t('features.console.inherited', {
              source: t(labelKey(resolved.source ?? feature)),
            })}
          </Text>
        ) : null}

        <View className="flex-row items-center gap-3 border-t border-border pt-3">
          <View className="flex-1 gap-0.5">
            <Text variant="label">{t('features.console.exemptLabel')}</Text>
            <Text variant="caption" tone="muted">
              {t('features.console.exemptHint')}
            </Text>
          </View>
          <Pressable
            testID="feature-exempt-toggle"
            accessibilityRole="switch"
            accessibilityState={{ checked: draft.exempt }}
            onPress={() =>
              setDraft((current) => ({ ...current, exempt: !current.exempt }))
            }
            className={cn(
              'h-7 w-12 justify-center rounded-full border px-0.5',
              draft.exempt
                ? 'border-brass bg-brass/25'
                : 'border-input bg-muted',
            )}
          >
            <View
              className={cn(
                'h-5 w-5 rounded-full',
                draft.exempt
                  ? 'self-end bg-brass'
                  : 'self-start bg-muted-foreground',
              )}
            />
          </Pressable>
        </View>

        <View className="gap-1.5">
          <Text variant="label">{t('features.console.noteLabel')}</Text>
          <Input
            testID="feature-note-input"
            value={draft.note}
            onChangeText={(note) =>
              setDraft((current) => ({ ...current, note }))
            }
            placeholder={t('features.console.notePlaceholder')}
            accessibilityLabel={t('features.console.noteLabel')}
            maxLength={500}
          />
          <Text variant="caption" tone="muted">
            {t('features.console.noteHint')}
          </Text>
        </View>

        <DialogFooter className="flex-row items-center gap-2">
          {overridden || staged ? (
            <Button
              variant="link"
              size="sm"
              label={t('features.console.reset')}
              onPress={() => onApply({ state: null, note: '', exempt: false })}
            />
          ) : null}
          <Button
            className="flex-1"
            label={t('features.console.apply')}
            testID="feature-editor-apply"
            onPress={() => onApply(draft)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StateChoice({
  state,
  selected,
  onPress,
}: {
  state: FeatureState;
  selected: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Pressable
      testID={`feature-state:${state}`}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cn(
        'h-11 flex-1 flex-row items-center justify-center gap-2 rounded-lg border px-2',
        selected ? 'border-brass/60 bg-secondary' : 'border-input',
      )}
    >
      <View
        className={cn(
          'h-4 w-4 items-center justify-center rounded-full border',
          selected ? 'border-brass' : 'border-input',
        )}
      >
        {selected ? <View className="h-2 w-2 rounded-full bg-brass" /> : null}
      </View>
      <Text variant="label" numberOfLines={1} className="min-w-0 shrink">
        {t(STATE_COPY[state])}
      </Text>
    </Pressable>
  );
}
