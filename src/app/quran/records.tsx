import { QuranRecordsScreen } from '@/features/quran/records/records-screen';

/**
 * `/quran/records` — memorisation, bookmarks and notes.
 *
 * A pushed page rather than a tab: the reader's records are a detail of the
 * Quran destination, not a fourth place to live. The screen owns the signed-out
 * state, because the route is reachable while auth gating is off.
 */
export default function QuranRecordsRoute() {
  return <QuranRecordsScreen />;
}
