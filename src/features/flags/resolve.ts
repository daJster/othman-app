import type { UserRole } from '@/core/types';
import {
  FEATURE_KEYS,
  FEATURE_NODES,
  featureChain,
  type FeatureKey,
} from './registry';
import {
  EMPTY_FEATURE_CONFIG,
  RESTRICTION_RANK,
  type FeatureConfig,
  type FeatureOverride,
  type FeatureState,
  type FeatureView,
} from './types';

/**
 * Turning sparse overrides into one answer per key.
 *
 * Pure on purpose: the provider is the only thing that knows about queries, and
 * these rules are what the unit tests pin. Two properties matter and both are
 * tested:
 *
 *  1. **Inheritance is a maximum.** A key's state is the most restrictive rung
 *     anywhere on its chain, so a parent cannot be bypassed by a child.
 *  2. **Exemption is per node.** A role listed on one override is unaffected by
 *     *that* node only; an ancestor's restriction still applies. That is what
 *     makes "turn meetings off for everyone except superadmins" safe — the app
 *     itself can still be switched off around them.
 */

export type ResolvedFeature = {
  key: FeatureKey;
  state: FeatureState;
  /** The key whose override produced `state`, or `null` when nothing is set. */
  source: FeatureKey | null;
  /** The override written on this key itself, if any. */
  override: FeatureOverride | null;
  /** True when the restriction comes from an ancestor. */
  inherited: boolean;
};

export type ResolvedFeatures = Readonly<Record<FeatureKey, ResolvedFeature>>;

/** Roles that can be exempted. `guest` cannot: it has no stored role. */
export function isExempt(
  override: FeatureOverride,
  role: UserRole | null,
): boolean {
  if (!role || role === 'guest') return false;

  return override.exemptRoles.includes(role);
}

/**
 * The effective state of one key.
 *
 * `role` is the viewer's role. `null`/`guest` is a signed-out visitor; it is
 * never exempt, because an exemption is a statement about a signed-in role.
 */
export function resolveFeature(
  key: FeatureKey,
  config: FeatureConfig = EMPTY_FEATURE_CONFIG,
  role: UserRole | null = null,
): ResolvedFeature {
  const override = config.flags[key] ?? null;

  /*
   * A locked node is always on — the same rule the server applies. The console
   * is how the app is recovered, so neither its own override (a hand edit) nor
   * an ancestor's can hide it from a superadmin. `RootNavigator` adds the other
   * half of the bootstrap rule: the switchboard stays reachable while the app
   * itself is off.
   */
  if (FEATURE_NODES[key]?.locked) {
    return { key, state: 'on', source: null, override, inherited: false };
  }

  let state: FeatureState = 'on';
  let source: FeatureKey | null = null;

  for (const node of featureChain(key)) {
    const nodeOverride = config.flags[node];

    if (!nodeOverride) continue;
    if (isExempt(nodeOverride, role)) continue;

    if (RESTRICTION_RANK[nodeOverride.state] > RESTRICTION_RANK[state]) {
      state = nodeOverride.state;
      source = node;
    }
  }

  return {
    key,
    state,
    source,
    override,
    inherited: source !== null && source !== key,
  };
}

export function resolveFeatures(
  config: FeatureConfig = EMPTY_FEATURE_CONFIG,
  role: UserRole | null = null,
): ResolvedFeatures {
  const resolved = {} as Record<FeatureKey, ResolvedFeature>;

  for (const key of FEATURE_KEYS) {
    resolved[key] = resolveFeature(key, config, role);
  }

  return resolved;
}

/** The three questions a screen asks, derived once. */
export function featureView(state: FeatureState): FeatureView {
  return {
    visible: state !== 'off',
    blocked: state === 'maintenance' || state === 'off',
    readable: state === 'on' || state === 'read-only',
    writable: state === 'on',
  };
}

/** Convenience for copy: which notice a blocked page shows. */
export function noticeForState(
  state: FeatureState,
): 'maintenance' | 'off' | null {
  if (state === 'maintenance') return 'maintenance';
  if (state === 'off') return 'off';

  return null;
}

/**
 * The aggregate the provider memoises.
 *
 * `resolved` covers every key; `byState` is what a caller that only has a state
 * string needs. Keeping the lookup here (instead of a second Map in the
 * provider) means the provider has no logic of its own.
 */
export type FeatureSnapshot = {
  config: FeatureConfig;
  resolved: ResolvedFeatures;
};

export function buildSnapshot(
  config: FeatureConfig,
  role: UserRole | null,
): FeatureSnapshot {
  return { config, resolved: resolveFeatures(config, role) };
}
