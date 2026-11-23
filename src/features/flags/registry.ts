import type { IconName } from '@/core/config';
import type { TabName } from '@/features/navigation/route-registry';
import type { FeatureState } from './types';

/**
 * The feature registry: every surface that can be switched off, in one tree.
 *
 * This file is the single answer to "what can be deactivated?". The console,
 * the route gate, the tab bar, the server's write lock and the documentation
 * all read it, so a new key is a single edit here (plus its copy). Nothing else
 * enumerates features.
 *
 * **Hierarchy is the dotted key.** `quran.records` sits under `quran`, which
 * sits under `app`. There is no `parent` field to get wrong, and the mock
 * server — which cannot import this file — derives the same chain from the same
 * string. See `docs/features.md`.
 *
 * **Level** is presentation, not behaviour: it tells the console how deep a row
 * is and it names the granularity in the docs. The resolver does not read it.
 *
 * A node marked `locked` cannot be switched off at all. `admin.features` is the
 * only one: the switchboard must not be able to lock itself out.
 */

export const FEATURE_KEYS = [
  'app',
  'home',
  'quran',
  'quran.reader',
  'quran.records',
  'quran.bookmarks',
  'quran.notes',
  'meetings',
  'meetings.create',
  'meetings.edit',
  'meetings.delete',
  'meetings.rsvp',
  'account',
  'account.edit',
  'account.progress',
  'admin',
  'admin.members',
  'admin.members.edit',
  'admin.features',
  'about',
  'auth',
  'auth.sign-in',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type FeatureLevel = 'app' | 'area' | 'page' | 'capability';

export type FeatureNode = {
  readonly key: FeatureKey;
  readonly level: FeatureLevel;
  /** The route this page owns. Longest prefix wins. Omitted for capabilities. */
  readonly path?: string;
  readonly icon: IconName;
  /** Cannot be turned off, even by a superadmin. */
  readonly locked?: true;
};

/**
 * Declared as `satisfies`, not `as`: a key in `FEATURE_KEYS` without a node is a
 * compile error, and a typo in a `path` is caught by the tests.
 */
const NODES = {
  app: { key: 'app', level: 'app', icon: 'layers' },
  home: { key: 'home', level: 'area', path: '/', icon: 'home' },
  quran: { key: 'quran', level: 'area', path: '/quran', icon: 'book-open' },
  'quran.reader': {
    key: 'quran.reader',
    level: 'page',
    path: '/reader',
    icon: 'book-open',
  },
  'quran.records': {
    key: 'quran.records',
    level: 'page',
    path: '/quran/records',
    icon: 'file-text',
  },
  'quran.bookmarks': {
    key: 'quran.bookmarks',
    level: 'capability',
    icon: 'bookmark',
  },
  'quran.notes': { key: 'quran.notes', level: 'capability', icon: 'pencil' },
  meetings: {
    key: 'meetings',
    level: 'area',
    path: '/meetings',
    icon: 'video',
  },
  'meetings.create': {
    key: 'meetings.create',
    level: 'capability',
    icon: 'plus',
  },
  'meetings.edit': {
    key: 'meetings.edit',
    level: 'capability',
    icon: 'pencil',
  },
  'meetings.delete': {
    key: 'meetings.delete',
    level: 'capability',
    icon: 'trash',
  },
  'meetings.rsvp': {
    key: 'meetings.rsvp',
    level: 'capability',
    icon: 'calendar-check',
  },
  account: {
    key: 'account',
    level: 'area',
    path: '/account',
    icon: 'user',
  },
  'account.edit': {
    key: 'account.edit',
    level: 'page',
    path: '/account/edit',
    icon: 'pencil',
  },
  'account.progress': {
    key: 'account.progress',
    level: 'page',
    path: '/account/progress',
    icon: 'chart-line',
  },
  admin: { key: 'admin', level: 'area', icon: 'users' },
  'admin.members': {
    key: 'admin.members',
    level: 'page',
    path: '/admin/members',
    icon: 'users',
  },
  'admin.members.edit': {
    key: 'admin.members.edit',
    level: 'page',
    path: '/admin/members/edit',
    icon: 'pencil',
  },
  'admin.features': {
    key: 'admin.features',
    level: 'page',
    path: '/admin/features',
    icon: 'alert-circle',
    locked: true,
  },
  about: { key: 'about', level: 'page', path: '/about', icon: 'info' },
  auth: { key: 'auth', level: 'area', icon: 'logout' },
  'auth.sign-in': {
    key: 'auth.sign-in',
    level: 'page',
    path: '/auth/sign-in',
    icon: 'logout',
  },
} as const satisfies Record<FeatureKey, FeatureNode>;

export const FEATURE_NODES: Readonly<Record<FeatureKey, FeatureNode>> = NODES;

/**
 * The chain from the root to `key`, inclusive.
 *
 * `meetings.edit` → `['app', 'meetings', 'meetings.edit']`. The first element is
 * always `app`, because "everything is off" has to reach every key without a
 * second mechanism.
 */
export function featureChain(key: FeatureKey): FeatureKey[] {
  if (key === 'app') return ['app'];

  const parts = key.split('.');
  const chain: FeatureKey[] = ['app'];

  for (let index = 1; index < parts.length; index += 1) {
    chain.push(parts.slice(0, index).join('.') as FeatureKey);
  }

  chain.push(key);

  return chain;
}

export function isFeatureKey(value: string): value is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(value);
}

/** Ancestors only, root first: what a node inherits from. */
export function featureAncestors(key: FeatureKey): FeatureKey[] {
  return featureChain(key).slice(0, -1);
}

const PATH_NODES: readonly (FeatureNode & { path: string })[] = (
  FEATURE_KEYS.map((key) => NODES[key]) as readonly FeatureNode[]
)
  .filter(
    (node): node is FeatureNode & { path: string } =>
      typeof node.path === 'string',
  )
  /* Longest path first: `/account/progress` must beat `/account`. */
  .sort((a, b) => b.path.length - a.path.length);

/**
 * Which feature owns a URL.
 *
 * Prefix matching is segment-aware: `/accounting` is not `/account`. Routes with
 * no owner (`/error/404`, `/auth/sign-in` is owned, `/`) fall through to the
 * app-level gate, never to an unrelated page.
 */
export function featureForPath(pathname: string): FeatureKey | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  for (const node of PATH_NODES) {
    if (path === node.path || path.startsWith(`${node.path}/`)) {
      return node.key;
    }
  }

  return null;
}

/**
 * Which feature owns a tab.
 *
 * Kept next to the registry so hiding a tab and blocking its page can never
 * disagree about the key.
 */
export const TAB_FEATURES: Readonly<Record<TabName, FeatureKey>> = {
  index: 'home',
  quran: 'quran',
  meetings: 'meetings',
  account: 'account',
};

/** Human-facing depth, used to sort and indent the console. */
export const LEVEL_ORDER: Readonly<Record<FeatureLevel, number>> = {
  app: 0,
  area: 1,
  page: 2,
  capability: 3,
};

/** A node that can be overridden at all (the console cannot edit locked nodes). */
export function isEditable(node: FeatureNode): boolean {
  return node.locked !== true;
}

/** Wording for a state, in one place. */
export type FeatureStateCopyKey =
  | 'features.state.on'
  | 'features.state.readOnly'
  | 'features.state.maintenance'
  | 'features.state.off';

export const STATE_COPY: Readonly<Record<FeatureState, FeatureStateCopyKey>> = {
  on: 'features.state.on',
  'read-only': 'features.state.readOnly',
  maintenance: 'features.state.maintenance',
  off: 'features.state.off',
};

export type FeatureStateHintKey =
  | 'features.console.stateHint.on'
  | 'features.console.stateHint.readOnly'
  | 'features.console.stateHint.maintenance'
  | 'features.console.stateHint.off';

export const STATE_HINT: Readonly<Record<FeatureState, FeatureStateHintKey>> = {
  on: 'features.console.stateHint.on',
  'read-only': 'features.console.stateHint.readOnly',
  maintenance: 'features.console.stateHint.maintenance',
  off: 'features.console.stateHint.off',
};

export type FeatureLevelCopyKey = `features.console.level.${FeatureLevel}`;

export function levelKey(key: FeatureKey): FeatureLevelCopyKey {
  return `features.console.level.${FEATURE_NODES[key].level}`;
}

export type FeatureLabelKey = `features.${FeatureKey}.label`;
export type FeatureDescriptionKey = `features.${FeatureKey}.description`;

export function labelKey(key: FeatureKey): FeatureLabelKey {
  return `features.${key}.label`;
}

export function descriptionKey(key: FeatureKey): FeatureDescriptionKey {
  return `features.${key}.description`;
}
