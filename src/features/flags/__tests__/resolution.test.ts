import {
  FEATURE_KEYS,
  FEATURE_NODES,
  TAB_FEATURES,
  featureAncestors,
  featureChain,
  featureForPath,
  isEditable,
} from '../registry';
import {
  featureView,
  resolveFeature,
  resolveFeatures,
  type ResolvedFeature,
} from '../resolve';
import {
  EMPTY_FEATURE_CONFIG,
  type FeatureConfig,
  type FeatureOverride,
} from '../types';

function override(
  state: FeatureOverride['state'],
  exemptRoles: FeatureOverride['exemptRoles'] = [],
): FeatureOverride {
  return {
    state,
    note: null,
    exemptRoles,
    updatedAt: null,
    updatedBy: null,
  };
}

function config(flags: Record<string, FeatureOverride>): FeatureConfig {
  return { ...EMPTY_FEATURE_CONFIG, flags };
}

function stateOf(
  key: Parameters<typeof resolveFeature>[0],
  cfg: FeatureConfig,
): ResolvedFeature {
  return resolveFeature(key, cfg, null);
}

describe('feature registry', () => {
  it('derives the chain from the dotted key, root first', () => {
    expect(featureChain('app')).toEqual(['app']);
    expect(featureChain('meetings')).toEqual(['app', 'meetings']);
    expect(featureChain('meetings.create')).toEqual([
      'app',
      'meetings',
      'meetings.create',
    ]);
    expect(featureChain('admin.members.edit')).toEqual([
      'app',
      'admin',
      'admin.members',
      'admin.members.edit',
    ]);
  });

  it('agrees with the parent the key spells out', () => {
    for (const key of FEATURE_KEYS) {
      const ancestors = featureAncestors(key);

      if (key === 'app') {
        expect(ancestors).toEqual([]);
        continue;
      }

      const parent = ancestors[ancestors.length - 1];

      expect(ancestors[0]).toBe('app');
      expect(FEATURE_KEYS).toContain(parent);
      expect(key.includes('.') ? key.startsWith(`${parent}.`) : parent).toBe(
        key.includes('.') ? true : 'app',
      );
    }
  });

  it('maps every tab to a registered key', () => {
    for (const key of Object.values(TAB_FEATURES)) {
      expect(FEATURE_KEYS).toContain(key);
    }
  });

  it('locks only the switchboard', () => {
    const locked = FEATURE_KEYS.filter(
      (key) => !isEditable(FEATURE_NODES[key]),
    );

    expect(locked).toEqual(['admin.features']);
  });
});

describe('feature paths', () => {
  it('gives the deepest owned path the page', () => {
    expect(featureForPath('/quran')).toBe('quran');
    expect(featureForPath('/quran/records')).toBe('quran.records');
    expect(featureForPath('/account/edit')).toBe('account.edit');
    expect(featureForPath('/account/progress')).toBe('account.progress');
    expect(featureForPath('/admin/members/edit')).toBe('admin.members.edit');
  });

  it('matches dynamic routes by their segment prefix', () => {
    expect(featureForPath('/reader/42')).toBe('quran.reader');
  });

  it('does not match a path that merely starts with the same letters', () => {
    expect(featureForPath('/accounting')).toBeNull();
    expect(featureForPath('/quranx')).toBeNull();
  });

  it('tolerates a trailing slash and owns the root', () => {
    expect(featureForPath('/quran/')).toBe('quran');
    expect(featureForPath('/')).toBe('home');
  });

  it('leaves unregistered routes to the app-level gate', () => {
    expect(featureForPath('/error/404')).toBeNull();
  });
});

describe('feature resolution', () => {
  it('is on when nothing is configured', () => {
    const resolved = stateOf('meetings.create', EMPTY_FEATURE_CONFIG);

    expect(resolved.state).toBe('on');
    expect(resolved.source).toBeNull();
    expect(resolved.inherited).toBe(false);
  });

  it('inherits the most restrictive state from an ancestor', () => {
    const cfg = config({ meetings: override('maintenance') });

    const child = stateOf('meetings.create', cfg);

    expect(child.state).toBe('maintenance');
    expect(child.source).toBe('meetings');
    expect(child.inherited).toBe(true);
  });

  it('never lets a child be more permissive than its parent', () => {
    const cfg = config({
      meetings: override('off'),
      'meetings.create': override('on'),
    });

    expect(stateOf('meetings.create', cfg).state).toBe('off');
  });

  it('lets a child be stricter than its parent', () => {
    const cfg = config({
      meetings: override('read-only'),
      'meetings.delete': override('off'),
    });

    expect(stateOf('meetings', cfg).state).toBe('read-only');
    expect(stateOf('meetings.delete', cfg).state).toBe('off');
    expect(stateOf('meetings.delete', cfg).source).toBe('meetings.delete');
  });

  it('applies the app switch to everything except the switchboard', () => {
    const cfg = config({ app: override('off') });
    const resolved = resolveFeatures(cfg, null);

    for (const key of FEATURE_KEYS) {
      expect(resolved[key].state).toBe(key === 'admin.features' ? 'on' : 'off');
    }
  });

  it('exempts a role from one node only', () => {
    const cfg = config({
      meetings: override('off', ['superadmin']),
      app: override('maintenance'),
    });

    expect(resolveFeature('meetings', cfg, 'superadmin').state).toBe(
      'maintenance',
    );
    expect(resolveFeature('meetings', cfg, 'admin').state).toBe('off');
    expect(resolveFeature('meetings', cfg, null).state).toBe('off');
  });

  it('keeps the switchboard on even if the document says otherwise', () => {
    const cfg = config({ 'admin.features': override('off') });

    expect(stateOf('admin.features', cfg).state).toBe('on');
  });

  it('exposes the three questions a screen asks', () => {
    expect(featureView('on')).toEqual({
      visible: true,
      blocked: false,
      readable: true,
      writable: true,
    });
    expect(featureView('read-only')).toEqual({
      visible: true,
      blocked: false,
      readable: true,
      writable: false,
    });
    expect(featureView('maintenance')).toEqual({
      visible: true,
      blocked: true,
      readable: false,
      writable: false,
    });
    expect(featureView('off')).toEqual({
      visible: false,
      blocked: true,
      readable: false,
      writable: false,
    });
  });
});
