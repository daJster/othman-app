/**
 * Calendar-day key, independent of time and timezone.
 *
 * `YYYY-MM-DD` is the wire format (Firestore field, mock JSON, query key) and
 * the thing the UI groups by. It is deliberately **not** an ISO timestamp: a
 * `Date` crossing midnight in a non-UTC zone would land on the wrong day, and
 * meetings are a day-level concept.
 */
export type DateKey = `${number}-${number}-${number}`;
