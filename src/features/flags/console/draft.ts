import type { FeatureChange, FeatureOverride, FeatureState } from '../types';

/**
 * One editable switch, before it is saved.
 *
 * `state: null` means "no override" — inherit from the ancestors, which for a
 * top-level area means on. Keeping the default as absence (not as the string
 * `'on'`) is what makes "Reset to default" distinguishable from "explicitly
 * on", and it is exactly what the server stores.
 */
export type FeatureDraft = {
  state: FeatureState | null;
  note: string;
  /** Keep the switch working for superadmins while everyone else is restricted. */
  exempt: boolean;
};

export const DEFAULT_DRAFT: FeatureDraft = {
  state: null,
  note: '',
  exempt: false,
};

export function draftFromOverride(
  override: FeatureOverride | null | undefined,
): FeatureDraft {
  if (!override) return DEFAULT_DRAFT;

  return {
    state: override.state,
    note: override.note ?? '',
    exempt: override.exemptRoles.includes('superadmin'),
  };
}

export function sameDraft(a: FeatureDraft, b: FeatureDraft): boolean {
  return (
    a.state === b.state &&
    a.note.trim() === b.note.trim() &&
    a.exempt === b.exempt
  );
}

/**
 * The wire payload for one staged switch.
 *
 * `note` travels even when the state is cleared: the server drops the whole
 * override on `state: null`, so sending the note is harmless and keeps this
 * function total.
 */
export function draftChange(key: string, draft: FeatureDraft): FeatureChange {
  return {
    key,
    state: draft.state,
    note: draft.note.trim() || null,
    exemptRoles: draft.exempt ? ['superadmin'] : [],
  };
}
