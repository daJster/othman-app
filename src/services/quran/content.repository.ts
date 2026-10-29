import { quranAyahUrl } from '@/core/config';
import { parseAyahContent } from '@/core/domain/quran/parse';
import type { HttpClient } from '@/platform/http';
import type { AyahContentRepository } from './quran.types';

/**
 * One ayah's text, from the alquran.cloud API.
 *
 * The URL builder already validates the absolute number (1–6236), so a bad
 * value fails before a request is made. The response is wrapped in
 * `{code, status, data}`, and the parser checks `code` rather than trusting the
 * HTTP status alone: the API answers 200 for some "not found" bodies.
 */
export function createAyahContentRepository(
  client: HttpClient,
  urlForAyah: (absoluteNumber: number) => string = quranAyahUrl,
): AyahContentRepository {
  return {
    async byAbsoluteNumber(absoluteNumber) {
      const payload = await client.get<unknown>(urlForAyah(absoluteNumber));

      return parseAyahContent(payload);
    },
  };
}
