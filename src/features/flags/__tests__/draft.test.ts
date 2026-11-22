import {
  DEFAULT_DRAFT,
  draftChange,
  draftFromOverride,
  sameDraft,
} from '../console/draft';
import type { FeatureOverride } from '../../flags/types';

function override(patch: Partial<FeatureOverride> = {}): FeatureOverride {
  return {
    state: 'maintenance',
    note: 'Investigating the calendar crash',
    exemptRoles: ['superadmin'],
    updatedAt: null,
    updatedBy: null,
    ...patch,
  };
}

describe('feature drafts', () => {
  it('starts at "no override"', () => {
    expect(draftFromOverride(null)).toEqual(DEFAULT_DRAFT);
    expect(DEFAULT_DRAFT).toEqual({ state: null, note: '', exempt: false });
  });

  it('reads an override into the editor', () => {
    expect(draftFromOverride(override())).toEqual({
      state: 'maintenance',
      note: 'Investigating the calendar crash',
      exempt: true,
    });
  });

  it('compares the staged draft with the saved one', () => {
    const saved = draftFromOverride(override());

    expect(sameDraft(saved, { ...saved, note: `${saved.note}  ` })).toBe(true);
    expect(sameDraft(saved, { ...saved, exempt: false })).toBe(false);
  });

  it('sends a null state to clear the override', () => {
    expect(draftChange('meetings', DEFAULT_DRAFT)).toEqual({
      key: 'meetings',
      state: null,
      note: null,
      exemptRoles: [],
    });
  });

  it('sends the exemption only for the roles the switch allows', () => {
    expect(
      draftChange('meetings.delete', {
        state: 'off',
        note: 'Broken for everyone',
        exempt: true,
      }),
    ).toEqual({
      key: 'meetings.delete',
      state: 'off',
      note: 'Broken for everyone',
      exemptRoles: ['superadmin'],
    });
  });
});
