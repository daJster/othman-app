import {
  array,
  asOneOf,
  asRecord,
  asString,
  at,
  missingAsNull,
  type Parser,
} from '@/core/domain/wire/shape';
import type {
  BackendFeatureConfig,
  BackendFeatureOverride,
  BackendFeatureState,
} from '@/platform/backend';
import type { UserRole } from '@/core/types';

/**
 * The feature switchboard document. A malformed override is rejected rather
 * than applied: a kill switch that reads `undefined` as "on" would silently
 * re-enable a feature that was switched off.
 */

const parseState = asOneOf<BackendFeatureState>([
  'on',
  'read-only',
  'maintenance',
  'off',
]);
const parseExemptRole = asOneOf<Exclude<UserRole, 'guest'>>([
  'user',
  'admin',
  'superadmin',
]);

const parseOverride: Parser<BackendFeatureOverride> = (value, path) => {
  const row = asRecord(value, path);

  return {
    state: parseState(row.state, at(path, 'state')),
    note: missingAsNull(asString)(row.note, at(path, 'note')),
    exemptRoles: array(parseExemptRole)(
      row.exemptRoles ?? [],
      at(path, 'exemptRoles'),
    ),
    updatedAt: missingAsNull(asString)(row.updatedAt, at(path, 'updatedAt')),
    updatedBy: missingAsNull(asString)(row.updatedBy, at(path, 'updatedBy')),
  };
};

/** `GET /v1/config/features`: the whole document, never partial. */
export function parseFeatureConfig(payload: unknown): BackendFeatureConfig {
  const row = asRecord(payload, 'response');
  const flags = asRecord(row.flags, 'flags');

  return {
    flags: Object.fromEntries(
      Object.entries(flags).map(([key, override]) => [
        key,
        parseOverride(override, `flags.${key}`),
      ]),
    ),
    updatedAt: missingAsNull(asString)(row.updatedAt, 'updatedAt'),
    updatedBy: missingAsNull(asString)(row.updatedBy, 'updatedBy'),
  };
}
