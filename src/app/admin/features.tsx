import { FeatureConsole } from '@/features/flags/console/feature-console';
import { RequireRole } from '@/features/auth/require-role';

/**
 * `/admin/features` — the remote switchboard.
 *
 * Superadmin only, and deliberately outside the flag system: this screen is
 * how the app is recovered, so it is the one surface that cannot be switched
 * off. The server enforces the same rule (it refuses `admin.features` as a key),
 * which is why the gate is duplicated rather than derived from a flag.
 */
export default function FeaturesRoute() {
  return (
    <RequireRole minimum="superadmin">
      <FeatureConsole />
    </RequireRole>
  );
}
