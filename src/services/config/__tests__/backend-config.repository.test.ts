import {
  createBackendConfigRepository,
  type ConfigBackend,
} from '@/services/config/backend-config.repository';

/**
 * The switchboard document. A malformed override must be refused rather than
 * applied: a `state` that reads as `undefined` would fall through to "on" and
 * silently re-enable a feature somebody switched off.
 */

const DOCUMENT = {
  flags: {
    'meetings.create': {
      state: 'read-only',
      note: 'Maintenance window',
      exemptRoles: ['admin'],
      updatedAt: '2026-04-01T10:00:00.000Z',
      updatedBy: 'admin@kuttab.test',
    },
  },
  updatedAt: '2026-04-01T10:00:00.000Z',
  updatedBy: 'admin@kuttab.test',
};

function fakeBackend(
  overrides: Partial<
    Record<'getFeatureConfig' | 'saveFeatureChanges', jest.Mock>
  > = {},
): ConfigBackend {
  return {
    getFeatureConfig: jest.fn().mockResolvedValue(DOCUMENT),
    saveFeatureChanges: jest.fn().mockResolvedValue(DOCUMENT),
    ...overrides,
  } as unknown as ConfigBackend;
}

describe('createBackendConfigRepository', () => {
  it('returns the whole validated document', async () => {
    const repository = createBackendConfigRepository(fakeBackend());

    await expect(repository.getFeatures()).resolves.toEqual(DOCUMENT);
  });

  it('defaults a missing exemptRoles to none rather than to everyone', async () => {
    const { exemptRoles: _omitted, ...override } =
      DOCUMENT.flags['meetings.create'];
    const repository = createBackendConfigRepository(
      fakeBackend({
        getFeatureConfig: jest.fn().mockResolvedValue({
          ...DOCUMENT,
          flags: { 'meetings.create': override },
        }),
      }),
    );

    const config = await repository.getFeatures();

    expect(config.flags['meetings.create'].exemptRoles).toEqual([]);
  });

  it('rejects an override with an unknown state and names its path', async () => {
    const repository = createBackendConfigRepository(
      fakeBackend({
        getFeatureConfig: jest.fn().mockResolvedValue({
          flags: {
            'meetings.create': {
              ...DOCUMENT.flags['meetings.create'],
              state: 'disabled',
            },
          },
        }),
      }),
    );

    await expect(repository.getFeatures()).rejects.toMatchObject({
      name: 'WireShapeError',
      path: 'flags.meetings.create.state',
    });
  });

  it('sends only the fields each change sets', async () => {
    const saveFeatureChanges = jest.fn().mockResolvedValue(DOCUMENT);
    const repository = createBackendConfigRepository(
      fakeBackend({ saveFeatureChanges }),
    );

    await repository.saveFeatures([{ key: 'meetings', state: 'off' }]);

    expect(saveFeatureChanges).toHaveBeenCalledWith([
      { key: 'meetings', state: 'off' },
    ]);
  });
});
