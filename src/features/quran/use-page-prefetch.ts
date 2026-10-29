import { Image } from 'expo-image';
import { useEffect } from 'react';
import { isPageInEdition, quranPageImageUrl } from '@/core/domain/quran/page';
import type { QuranEdition } from '@/core/types';

/**
 * Warm the neighbouring pages, but only once the reader has settled.
 *
 * A timer, not an effect on every rendered page: dragging through ten pages
 * would otherwise queue forty downloads that the user may never see. Every turn
 * cancels the previous timer, so only the page the reader actually stopped on
 * prefetches its neighbours — "skip on fast swipes" without tracking swipe
 * speed.
 *
 * `expo-image` is imported directly rather than through `@/ui/image`: that
 * wrapper exists to give the *component* `className`, and the static
 * `prefetch` would have to survive `withUniwind` to reach this call.
 */

/** How long a page must stay current before its neighbours are fetched. */
export const PREFETCH_DELAY = 250;

/** Pages on each side. Two because a fast reader turns twice before settling. */
export const PREFETCH_RADIUS = 2;

export function usePagePrefetch(
  edition: QuranEdition | null,
  page: number,
): void {
  useEffect(() => {
    if (!edition) return;

    const timer = setTimeout(() => {
      const urls: string[] = [];

      for (let distance = 1; distance <= PREFETCH_RADIUS; distance += 1) {
        for (const candidate of [page + distance, page - distance]) {
          if (isPageInEdition(edition, candidate)) {
            urls.push(quranPageImageUrl(edition, candidate));
          }
        }
      }

      if (urls.length > 0) void Image.prefetch(urls, 'memory-disk');
    }, PREFETCH_DELAY);

    return () => clearTimeout(timer);
  }, [edition, page]);
}
