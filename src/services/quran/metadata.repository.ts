import { QURAN_METADATA_URL } from '@/core/config';
import { parseSurahMetadata } from '@/core/domain/quran/parse';
import type { HttpClient } from '@/platform/http';
import type { MetadataRepository } from './quran.types';

/** `quran.json` over HTTP — the 114 surahs, validated against the expected count. */
export function createMetadataRepository(
  client: HttpClient,
  url: string = QURAN_METADATA_URL,
): MetadataRepository {
  return {
    async list() {
      const payload = await client.get<unknown>(url);

      return parseSurahMetadata(payload);
    },
  };
}
