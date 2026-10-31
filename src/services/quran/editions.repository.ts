import { QURAN_EDITIONS_URL } from '@/core/config';
import { parseEditions } from '@/core/domain/quran/parse';
import type { HttpClient } from '@/platform/http';
import type { EditionsRepository } from './quran.types';

/**
 * `editions.json` over HTTP.
 *
 * The URL is a parameter so a test can point the repository at a fixture URL
 * and assert exactly what was requested; the production caller passes only the
 * client and gets the configured endpoint.
 */
export function createEditionsRepository(
  client: HttpClient,
  url: string = QURAN_EDITIONS_URL,
): EditionsRepository {
  return {
    async list() {
      const payload = await client.get<unknown>(url);

      return parseEditions(payload);
    },
  };
}
