import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { MOCK_BACKEND_ENABLED } from '@/platform/backend';
import { useAuth } from '@/providers/auth-provider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/panel';
import { cn } from '@/ui/cn';
import { Icon } from '@/ui/icon';
import { Pressable } from '@/ui/pressable';
import { Text } from '@/ui/text';

/**
 * Development account switcher.
 *
 * The mock backend has four seeded accounts and the product has no invitation
 * UI yet, so switching between them is the only way to verify that a scoped
 * screen (the meeting list, the admin rows, the role gate) really changes with
 * the session. Typing an email and password every time is enough friction that
 * the scoped behaviour goes untested; these rows sign in with the seed password
 * in one tap.
 *
 * The whole block is compiled out of production (`__DEV__` is false) and out of
 * offline fixture mode (no backend to sign in to).
 */
export const DEV_ACCOUNTS = [
  {
    email: 'shaykh@kuttab.test',
    name: 'الشيخ عبد الرحمن',
  },
  {
    email: 'student@kuttab.test',
    name: 'عثمان الفارسي',
  },
  {
    email: 'google@kuttab.test',
    name: 'Google Demo',
  },
  {
    email: 'admin@kuttab.test',
    name: 'Admin Demo',
  },
] as const;

export const DEV_ACCOUNT_PASSWORD = 'kuttab1234';

export const DEV_SWITCHER_ENABLED = __DEV__ && MOCK_BACKEND_ENABLED;

export type DevAccountListProps = {
  /** Called after the selected account's session is installed. */
  onDone?: () => void;
};

export function DevAccountList({ onDone }: DevAccountListProps) {
  const { t } = useTranslation();
  const { user, signInWithEmail } = useAuth();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const pick = async (email: string) => {
    if (pendingEmail) return;

    // Already this account: closing is the whole job.
    if (user?.email === email) {
      onDone?.();
      return;
    }

    setFailed(false);
    setPendingEmail(email);

    const result = await signInWithEmail(email, DEV_ACCOUNT_PASSWORD);

    setPendingEmail(null);

    if (result.status === 'success') {
      onDone?.();
      return;
    }

    setFailed(true);
  };

  return (
    <View className="gap-2">
      {DEV_ACCOUNTS.map((account) => {
        const current = user?.email === account.email;
        const pending = pendingEmail === account.email;
        const disabled = pendingEmail !== null;

        return (
          <Pressable
            key={account.email}
            testID={`dev-account:${account.email}`}
            accessibilityRole="button"
            accessibilityState={{ selected: current, busy: pending }}
            disabled={disabled}
            onPress={() => void pick(account.email)}
            className={cn(
              'min-h-14 flex-row items-center gap-3 rounded-lg border border-glass-edge px-3 py-2.5 active:opacity-80',
              current && 'bg-secondary',
              disabled && !pending && 'opacity-60',
            )}
          >
            <View className="min-w-0 flex-1 gap-0.5">
              <Text variant="label">{account.name}</Text>
              <Text variant="caption" tone="muted">
                {account.email}
              </Text>
            </View>

            {pending ? (
              <Text variant="caption" tone="muted">
                {t('action.loading')}
              </Text>
            ) : current ? (
              <Icon name="check" size={18} tone="primary" />
            ) : (
              <Icon name="chevron-right" size={16} tone="muted" />
            )}
          </Pressable>
        );
      })}

      {failed ? (
        <Text variant="caption" tone="destructive" accessibilityRole="alert">
          {t('auth.dev.switchFailed')}
        </Text>
      ) : null}
    </View>
  );
}

export type DevAccountDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function DevAccountDialog({ open, onClose }: DevAccountDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent testID="dev-switch-dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('auth.dev.switchAccount')}</DialogTitle>
          <DialogDescription>{t('auth.dev.switchHint')}</DialogDescription>
        </DialogHeader>

        <DevAccountList onDone={onClose} />
      </DialogContent>
    </Dialog>
  );
}
