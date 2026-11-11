import { useLocalSearchParams } from 'expo-router';
import { RequireRole } from '@/features/auth/require-role';
import { MeetingFormScreen } from '@/features/meetings/meeting-form-screen';

/**
 * `/meetings/edit` and `/meetings/edit?id=12`.
 *
 * One sheet for create and edit, presented as a `formSheet` by the root layout
 * — the same shape as `account/edit`. The route only normalises the id: a
 * missing or malformed value means "create", never a request for meeting 0.
 */
export default function MeetingEditRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const parsed = Number(id);
  const meetingId = Number.isInteger(parsed) && parsed > 0 ? parsed : null;

  return (
    <RequireRole>
      <MeetingFormScreen id={meetingId} />
    </RequireRole>
  );
}
