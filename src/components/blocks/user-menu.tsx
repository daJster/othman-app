import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { TriggerRef } from '@rn-primitives/popover';
import {
  useCurrentAccount,
  useSignOut,
} from '@/features/account/use-current-account';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

/**
 * The session menu for the web navbar.
 *
 * It shows who is signed in, offers the two account destinations, and puts the
 * destructive action behind the same AlertDialog the Account screen uses.
 * Nothing renders while signed out.
 */
export function UserMenu() {
  const { t } = useTranslation();
  const router = useRouter();
  const { authUser, state } = useCurrentAccount();
  const signOut = useSignOut();
  const triggerRef = useRef<TriggerRef>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!authUser) return null;

  const account = state.status === 'ready' ? state.data : null;
  const name = account?.displayName ?? authUser.displayName ?? '';
  const email = account?.email ?? authUser.email ?? '';
  const photoURL = account?.photoURL ?? authUser.photoURL ?? null;

  const go = (href: '/account' | '/account/progress') => {
    triggerRef.current?.close();
    router.push(href);
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild ref={triggerRef}>
          <Button
            variant="ghost"
            size="icon"
            accessibilityLabel={name || t('nav.account')}
            testID="user-menu-trigger"
          >
            <Avatar size="md" src={photoURL} name={name} />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-0">
          <View className="gap-3 border-b border-border p-4">
            <View className="flex-row items-center gap-3">
              <Avatar size="lg" src={photoURL} name={name} />
              <View className="min-w-0 flex-1 gap-0.5">
                <Text variant="label" numberOfLines={1}>
                  {name}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {email}
                </Text>
              </View>
            </View>
          </View>

          <View className="gap-1 p-2">
            <Button
              variant="ghost"
              className="justify-start gap-3"
              onPress={() => go('/account')}
              testID="user-menu-account"
            >
              <Icon name="user" size={18} tone="muted" />
              <Text variant="label">{t('nav.account')}</Text>
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-3"
              onPress={() => go('/account/progress')}
              testID="user-menu-progress"
            >
              <Icon name="chart-line" size={18} tone="muted" />
              <Text variant="label">{t('pages.account.progress.title')}</Text>
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-3"
              onPress={() => {
                triggerRef.current?.close();
                setConfirmOpen(true);
              }}
              testID="user-menu-sign-out"
            >
              <Icon name="logout" size={18} tone="destructive" />
              <Text variant="label" tone="destructive">
                {t('account.signOut.confirm')}
              </Text>
            </Button>
          </View>
        </PopoverContent>
      </Popover>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('account.signOut.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('account.signOut.message')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="h-11"
              onPress={() => setConfirmOpen(false)}
            >
              <Text>{t('account.signOut.cancel')}</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-11 bg-destructive"
              testID="user-menu-sign-out-confirm"
              onPress={() => void signOut()}
            >
              <Text className="text-destructive-foreground">
                {t('account.signOut.confirm')}
              </Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
