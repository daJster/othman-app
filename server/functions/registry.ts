import { accountFunctions } from './accounts.ts';
import { authFunctions } from './auth.ts';
import { meetingFunctions } from './meetings.ts';
import { quranFunctions } from './quran.ts';
import { systemFunctions } from './system.ts';
import type { FunctionRegistry } from './types.ts';

/**
 * One registry of named functions.
 *
 * Both the REST routes and `POST /v1/functions/:name` resolve through this map,
 * so there is exactly one implementation of each operation. That is what makes
 * the "callable function" simulation honest: a REST route cannot drift from the
 * function it claims to expose.
 *
 * The names are also the future Firebase Functions names (`auth-login` becomes
 * `onCall('auth.login')`), which is why they are dotted rather than kebab-case.
 */
export function createFunctionRegistry(): FunctionRegistry {
  return {
    ...authFunctions,
    ...accountFunctions,
    ...meetingFunctions,
    ...quranFunctions,
    ...systemFunctions,
  };
}
