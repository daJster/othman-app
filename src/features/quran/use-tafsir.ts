import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type {
  BookContentType,
  ContentBody,
  ContentSource,
  ContentType,
  SurahInfoSection,
} from '@/core/types';
import { toAsyncResult, type AsyncResult } from '@/features/query/async-state';
import { queryKeys } from '@/services/query';
import { tafsirService } from '@/services/tafsir';
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
  const local = ayah ? { surah: ayah.surah, ayah: ayah.ayah } : null;
  const isBookType = type !== 'surah';

  const sourceQuery = useQuery({
    queryKey: queryKeys.tafsir.sources(type, absoluteNumber ?? 0),
    queryFn: () => {
      if (local === null || !isBookType) {
        throw new Error('content sources requested without a selection');
      }

      return tafsirService.sources(type as BookContentType, local);
    },
    enabled: local !== null && isBookType,
    staleTime: Infinity,
  });

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

  const contentQuery = useQuery({
    queryKey: queryKeys.tafsir.content(
      type,
      absoluteNumber ?? 0,
      sourceId ?? 0,
    ),
    queryFn: () => {
      if (local === null || !isBookType || sourceId === null) {
        throw new Error('content requested without a selection');
      }

      return tafsirService.content(type as BookContentType, local, sourceId);
    },
    enabled: local !== null && isBookType && sourceId !== null,
    staleTime: Infinity,
  });

  const surahQuery = useQuery({
    queryKey: queryKeys.tafsir.surah(ayah?.surah ?? 0),
    queryFn: () => {
      if (ayah === null) {
        throw new Error('surah information requested without a selection');
      }

      return tafsirService.surahInfo(ayah.surah);
    },
    enabled: ayah !== null && type === 'surah',
    staleTime: Infinity,
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
