import {
  DEMO_ACCOUNT_EMAIL,
  DEMO_ACCOUNT_UID,
  DEMO_PROFILE,
  createDemoProfileRepository,
} from '@/services/profile/demo-profile.repository';

/**
 * The demo repository is temporary (P3.3 replaces it), but it is still a real
 * `ProfileRepository`: the account screens behave differently if a partial
 * write replaces the document instead of merging into it, so the contract is
 * pinned here.
 */
describe('createDemoProfileRepository', () => {
  it('returns the demo profile for the demo uid and nothing for another uid', async () => {
    const repository = createDemoProfileRepository(DEMO_PROFILE);

    await expect(repository.getByUid(DEMO_ACCOUNT_UID)).resolves.toEqual(
      DEMO_PROFILE,
    );
    await expect(repository.getByUid('someone-else')).resolves.toBeNull();
  });

  it('finds the profile by email, case-insensitively', async () => {
    const repository = createDemoProfileRepository(DEMO_PROFILE);

    await expect(
      repository.getByEmail(DEMO_ACCOUNT_EMAIL.toUpperCase()),
    ).resolves.toEqual(DEMO_PROFILE);
    await expect(
      repository.getByEmail('nope@example.test'),
    ).resolves.toBeNull();
  });

  it('merges a partial write instead of replacing the document', async () => {
    const repository = createDemoProfileRepository(DEMO_PROFILE);

    await repository.update(DEMO_ACCOUNT_UID, { displayName: 'New Name' });

    await expect(repository.getByUid(DEMO_ACCOUNT_UID)).resolves.toEqual({
      ...DEMO_PROFILE,
      displayName: 'New Name',
    });
  });

  it('writes null to clear a field', async () => {
    const repository = createDemoProfileRepository(DEMO_PROFILE);

    await repository.update(DEMO_ACCOUNT_UID, { phoneNumber: null });

    await expect(repository.getByUid(DEMO_ACCOUNT_UID)).resolves.toMatchObject({
      phoneNumber: null,
    });
  });

  it('snapshots without leaking the live object and can be reset', async () => {
    const repository = createDemoProfileRepository(DEMO_PROFILE);

    const snapshot = repository.snapshot();
    snapshot.displayName = 'mutated by the caller';

    expect(repository.snapshot().displayName).toBe(DEMO_PROFILE.displayName);

    await repository.update(DEMO_ACCOUNT_UID, { displayName: 'Changed' });
    repository.reset();

    expect(repository.snapshot()).toEqual(DEMO_PROFILE);
  });
});
