import { useState } from 'react';
import { api, useApiQuery } from '@/api';
import type {
  ContentBody,
  ContentSource,
  ContentType,
  SurahInfoSection,
} from '@/core/types';
import { toAsyncResult, type AsyncResult } from '@/features/query/async-state';
import type { SelectedAyah } from './ayah-content';

/**
 * Tafsir / e3rab / translation panel state.
 *
 * Identity rules:
 *
 *  - Option lists are keyed by **content type + absolute ayah**. Switching type
 *    starts a different query, so one type's list can never answer for another.
 *  - Content is keyed by **type + absolute ayah + source id**. A source id is
 *    only meaningful inside its type, so the type stays in the key.
 *  - A selection change or type change clears the chosen source. The content
 *    query is disabled until the new options resolve and the chosen id is
 *    proven to belong to that list, which closes the window where the previous
 *    type's source could be requested under the new type.
 *
 * Surah information is surah-level, so its query is keyed by surah and only
 * enabled while the `surah` type is active.
 */
export type TafsirPanelController = {
  type: ContentType;
  setType: (type: ContentType) => void;
  /** Selected source, or `null` while options are loading/empty. */
  sourceId: number | null;
  setSourceId: (sourceId: number) => void;
  selectedSource: ContentSource | null;
  sources: AsyncResult<ContentSource[]>;
  retrySources: () => void;
  content: AsyncResult<ContentBody>;
  surahInfo: AsyncResult<SurahInfoSection[]>;
};

export function useTafsirPanel(
  ayah: SelectedAyah | null,
): TafsirPanelController {
  const [type, setType] = useState<ContentType>('tafsir');
  // The chosen source remembers the identity it was chosen for. A type or ayah
  // change makes the record irrelevant without needing an effect to clear it.
  const [requestedSource, setRequestedSource] = useState<{
    type: ContentType;
    absoluteNumber: number | null;
    id: number;
  } | null>(null);

  const absoluteNumber = ayah?.absoluteNumber ?? null;
  const isBookType = type !== 'surah';

  const sourceQuery = useApiQuery(api.tafsir.sources, { type, ayah });

  const sourceRows = sourceQuery.data ?? [];
  const rememberedId =
    requestedSource !== null &&
    requestedSource.type === type &&
    requestedSource.absoluteNumber === absoluteNumber
      ? requestedSource.id
      : null;
  // A remembered id is only usable while the current list contains it. Until
  // the list resolves, no content request is made, so a type change cannot
  // fetch the previous type's source.
  const sourceId =
    isBookType &&
    rememberedId !== null &&
    sourceRows.some((row) => row.id === rememberedId)
      ? rememberedId
      : isBookType && sourceQuery.isSuccess
        ? (sourceRows[0]?.id ?? null)
        : null;

  const contentQuery = useApiQuery(api.tafsir.content, {
    type,
    ayah,
    sourceId,
  });

  const surahQuery = useApiQuery(api.tafsir.surah, {
    // Only the `surah` tab reads this, so a book type makes the question moot —
    // `null` disables it without a second `enabled` rule at the call site.
    surah: type === 'surah' ? (ayah?.surah ?? null) : null,
  });

  return {
    type,
    setType,
    sourceId,
    setSourceId: (id: number) =>
      setRequestedSource({ type, absoluteNumber, id }),
    selectedSource: sourceRows.find((row) => row.id === sourceId) ?? null,
    sources: toAsyncResult(sourceQuery, (rows) => rows.length === 0),
    retrySources: () => void sourceQuery.refetch(),
    content: toAsyncResult(contentQuery, (body) => body.status === 'empty'),
    surahInfo: toAsyncResult(surahQuery, (rows) => rows.length === 0),
  };
}
