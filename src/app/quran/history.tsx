import { HistoryScreen } from '@/features/quran/history-content/history-screen';

/**
 * The mushaf's history route.
 *
 * It is a pushed page beside the Quran tab, not a child of it, so `/quran`
 * keeps its URL and the tab bar is covered by the root stack's transition.
 */
export default function QuranHistoryRoute() {
  return <HistoryScreen />;
}
