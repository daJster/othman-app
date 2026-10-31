import type { AccountData } from '@/core/types';
import {
  DISPLAY_NAME_MAX_LENGTH,
  isProfileDraftDirty,
  normalizePhoneNumber,
  toProfileDraft,
  validateProfileDraft,
} from '@/core/domain/account/profile-validation';

const ACCOUNT: AccountData = {
  uid: 'uid-1',
  email: 'student@example.test',
  displayName: 'Othman',
  photoURL: null,
  role: 'user',
  phoneNumber: '+966501234567',
};

describe('normalizePhoneNumber', () => {
  it('keeps the country-code plus and drops the separators people type', () => {
    expect(normalizePhoneNumber(' +966 (50) 123-4567 ')).toBe('+966501234567');
    expect(normalizePhoneNumber('+44.20.7946.0000')).toBe('+442079460000');
  });
});

describe('validateProfileDraft', () => {
  it('accepts a trimmed name and a formatted phone number', () => {
    expect(
      validateProfileDraft({
        displayName: '  Othman  ',
        phoneNumber: '+966 50 123 4567',
      }),
    ).toEqual({});
  });

  it('requires a name', () => {
    expect(
      validateProfileDraft({ displayName: '   ', phoneNumber: '' }),
    ).toEqual({ displayName: 'required' });
  });

  it('rejects a one-character name and one longer than the limit', () => {
    expect(
      validateProfileDraft({ displayName: 'A', phoneNumber: '' }).displayName,
    ).toBe('length');
    expect(
      validateProfileDraft({
        displayName: 'A'.repeat(DISPLAY_NAME_MAX_LENGTH + 1),
        phoneNumber: '',
      }).displayName,
    ).toBe('length');
  });

  it('allows the boundaries exactly', () => {
    expect(
      validateProfileDraft({ displayName: 'Al', phoneNumber: '' }).displayName,
    ).toBeUndefined();
    expect(
      validateProfileDraft({
        displayName: 'A'.repeat(DISPLAY_NAME_MAX_LENGTH),
        phoneNumber: '',
      }).displayName,
    ).toBeUndefined();
  });

  it('leaves an empty phone number alone — clearing it is a valid edit', () => {
    expect(
      validateProfileDraft({ displayName: 'Othman', phoneNumber: '  ' }),
    ).toEqual({});
  });

  it('requires a country code and digits for a non-empty phone number', () => {
    for (const phoneNumber of [
      '0501234567',
      '+966',
      '+966 50 12',
      '00966501234567',
      '+9665012345678901',
      '++966501234567',
    ]) {
      expect(
        validateProfileDraft({ displayName: 'Othman', phoneNumber })
          .phoneNumber,
      ).toBe('invalid');
    }
  });
});

describe('isProfileDraftDirty', () => {
  it('ignores whitespace and phone formatting', () => {
    expect(
      isProfileDraftDirty(
        { displayName: '  Othman ', phoneNumber: ' +966 50 123 4567 ' },
        ACCOUNT,
      ),
    ).toBe(false);
  });

  it('sees a real name or phone change', () => {
    expect(
      isProfileDraftDirty(
        { displayName: 'Othman Al-Farsi', phoneNumber: '' },
        ACCOUNT,
      ),
    ).toBe(true);
    expect(
      isProfileDraftDirty({ displayName: 'Othman', phoneNumber: '' }, ACCOUNT),
    ).toBe(true);
  });

  it('treats a missing profile value as empty', () => {
    const sparse: AccountData = {
      ...ACCOUNT,
      displayName: null,
      phoneNumber: null,
    };

    expect(
      isProfileDraftDirty({ displayName: '', phoneNumber: '' }, sparse),
    ).toBe(false);
  });
});

describe('toProfileDraft', () => {
  it('maps null fields to empty inputs', () => {
    expect(
      toProfileDraft({
        ...ACCOUNT,
        displayName: null,
        phoneNumber: null,
      }),
    ).toEqual({ displayName: '', phoneNumber: '' });
  });
});
