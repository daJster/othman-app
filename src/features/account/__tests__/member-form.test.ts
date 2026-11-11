import type { BackendUser } from '@/api';
import {
  createEmptyMemberDraft,
  isMemberDraftDirty,
  toCreateMemberInput,
  toMemberDraft,
  toUpdateMemberPatch,
  validateMemberDraft,
} from '../member-form';

const account: BackendUser = {
  uid: 'uid-1',
  email: 'student@kuttab.test',
  displayName: 'Student',
  photoURL: null,
  role: 'user',
  phoneNumber: '+212600000000',
  disabled: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('member form', () => {
  it('requires a valid email, password and display name on create', () => {
    const errors = validateMemberDraft(
      { ...createEmptyMemberDraft(), email: 'nope', password: 'short' },
      'create',
    );

    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
    expect(validateMemberDraft(createEmptyMemberDraft(), 'create')).toEqual(
      expect.objectContaining({ email: expect.anything() }),
    );
  });

  it('does not ask for a password when editing', () => {
    const errors = validateMemberDraft(toMemberDraft(account), 'edit');

    expect(errors.password).toBeUndefined();
  });

  it('accepts a letter-and-digit password', () => {
    const errors = validateMemberDraft(
      {
        ...createEmptyMemberDraft(),
        email: 'new@kuttab.test',
        password: 'kuttab1234',
        displayName: 'New Member',
      },
      'create',
    );

    expect(errors).toEqual({});
  });

  it('sends one create payload with a trimmed email', () => {
    const input = toCreateMemberInput({
      ...createEmptyMemberDraft(),
      email: '  New@Kuttab.test ',
      password: 'kuttab1234',
      displayName: ' ',
      phoneNumber: '',
      role: 'admin',
    });

    expect(input).toEqual({
      email: 'new@kuttab.test',
      password: 'kuttab1234',
      phoneNumber: null,
      role: 'admin',
    });
    expect(input.displayName).toBeUndefined();
  });

  it('patches only what changed', () => {
    expect(toUpdateMemberPatch(toMemberDraft(account), account)).toEqual({});

    const patch = toUpdateMemberPatch(
      { ...toMemberDraft(account), displayName: 'Renamed', disabled: true },
      account,
    );

    expect(patch).toEqual({ displayName: 'Renamed', disabled: true });
    expect(isMemberDraftDirty(toMemberDraft(account), account)).toBe(false);
  });
});
