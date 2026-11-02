import { useRouter } from 'expo-router';
import { useState } from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useCurrentAccount,
  useSignOut,
} from '@/features/account/use-current-account';
import { useDirection } from '@/i18n';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

/**
 * Session menu in the web bar: who is signed in, the two account destinations,
 * and sign-in/sign-out.
 *
 * Theme and language are **not** here; they are their own ghost controls
 * (`ThemeMenu`, `LanguageMenu`) so a reader can change either without opening
 * the account menu. This keeps one control per job: identity and session here,
 * appearance and language next to it.
 *
 * The trigger is the avatar when signed in and a menu glyph when signed out.
 * Sign-out is destructive and behind the same `AlertDialog` the Account screen
 * uses.
 */
export function NavMenu() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isRTL } = useDirection();
  const { authUser, state } = useCurrentAccount();
  const signOut = useSignOut();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const account = state.status === 'ready' ? state.data : null;
  const name = account?.displayName ?? authUser?.displayName ?? '';
  const email = account?.email ?? authUser?.email ?? '';
  const photoURL = account?.photoURL ?? authUser?.photoURL ?? null;
  const signedIn = authUser !== null;

  // `closeOnPress` on a menu item closes this menu before the navigation
  // commits, so the portal is gone by the time the destination renders.
  const go = (href: '/account' | '/account/progress' | '/auth/sign-in') => {
    router.push(href);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            accessibilityLabel={name || t('nav.account')}
            testID="nav-menu-trigger"
          >
            {signedIn ? (
              <Avatar size="md" src={photoURL} name={name} />
            ) : (
              <Icon name="menu" size={20} />
            )}
          </Button>
        </DropdownMenuTrigger>

        {/* Radix aligns physically; mirror the anchor side so the menu stays
            attached to the avatar in RTL. */}
        <DropdownMenuContent
          align={isRTL ? 'start' : 'end'}
          className="w-64 bg-background"
          testID="nav-menu"
        >
          {signedIn ? (
            <>
              <View className="p-2">
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
              <DropdownMenuSeparator />

              <DropdownMenuItem
                onPress={() => go('/account')}
                testID="nav-menu-account"
              >
                <Icon name="user" size={18} tone="muted" />
                <Text variant="label">{t('nav.account')}</Text>
              </DropdownMenuItem>
              <DropdownMenuItem
                onPress={() => go('/account/progress')}
                testID="nav-menu-progress"
              >
                <Icon name="chart-line" size={18} tone="muted" />
                <Text variant="label">{t('pages.account.progress.title')}</Text>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
            </>
          ) : null}

          {signedIn ? (
            <DropdownMenuItem
              variant="destructive"
              onPress={() => setConfirmOpen(true)}
              testID="nav-menu-sign-out"
            >
              <Icon name="logout" size={18} tone="destructive" />
              <Text variant="label" tone="destructive">
                {t('action.signOut')}
              </Text>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onPress={() => go('/auth/sign-in')}
              testID="nav-menu-sign-in"
            >
              <Icon name="user" size={18} tone="muted" />
              <Text variant="label">{t('action.signIn')}</Text>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
              testID="nav-menu-sign-out-confirm"
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
