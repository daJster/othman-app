import { QURAN_METADATA_URL } from '@/core/config';
import { parseSurahMetadata } from '@/core/domain/quran/parse';
import type { HttpClient, RequestOptions } from '@/platform/http';
import type { MetadataRepository } from './quran.types';

/** `quran.json` over HTTP: the 114 surahs, validated against the expected count. */
export function createMetadataRepository(
  client: HttpClient,
  url: string = QURAN_METADATA_URL,
): MetadataRepository {
  return {
    async list(options?: RequestOptions) {
      const payload = await client.get<unknown>(url, options);

      return parseSurahMetadata(payload);
    },
  };
}
