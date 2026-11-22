import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import { api, useApiQuery } from '@/api';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { cn } from '@/ui/cn';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import { NativeSheetContent } from '@/ui/native-sheet-content';
import { Pressable } from '@/ui/pressable';
import { SheetHeader } from '@/ui/sheet-header';
import { Spinner } from '@/ui/spinner';
import { ErrorState } from '@/ui/states';
import { Text } from '@/ui/text';
import { ThemedBottomSheet } from '@/ui/themed-bottom-sheet';
import type { DraftAttendee } from './meeting-form';

/**
 * The invitation picker.
 *
 * The date and time live inline in the form dialog now; the invitation list is
 * still a sheet because choosing several people from a long cohort needs its
 * own scroll, search and finish. It shares the sheet shell with the account
 * pickers so its width, padding and header cannot drift.
 */
type SheetFrameProps = {
  title: string;
  testID: string;
  onClose: () => void;
  children: ReactNode;
};

function SheetFrame({ title, testID, onClose, children }: SheetFrameProps) {
  const window = useWindowDimensions();
  const native = Platform.OS !== 'web';

  return (
    <ThemedBottomSheet
      isPresented
      onDismiss={onClose}
      showDragIndicator={native}
      testID={testID}
    >
      <NativeSheetContent>
        {/*
         * A native sheet host gives its RN subtree no width: without an
         * explicit measure, the member rows lay out at their intrinsic width
         * and run off the edge. Web's dialog constrains itself.
         */}
        <View
          style={native ? { width: Math.max(0, window.width - 32) } : undefined}
          className={cn(
            'gap-4 p-4 pb-6',
            !native && 'mx-auto w-full max-w-md py-6',
          )}
        >
          <SheetHeader title={title} />
          {children}
        </View>
      </NativeSheetContent>
    </ThemedBottomSheet>
  );
}

export type AttendeeSheetProps = {
  open: boolean;
  selected: readonly DraftAttendee[];
  onChange: (attendees: DraftAttendee[]) => void;
  onClose: () => void;
};

export function AttendeeSheet({
  open,
  selected,
  onChange,
  onClose,
}: AttendeeSheetProps) {
  const { t } = useTranslation();
  const window = useWindowDimensions();
  const query = useApiQuery(api.demo.accounts.list, { limit: 100 });
  const [search, setSearch] = useState('');

  if (!open) return null;

  const accounts = query.data?.accounts ?? [];
  const needle = search.trim().toLowerCase();
  const visible = needle
    ? accounts.filter((account) =>
        `${account.displayName ?? ''} ${account.email ?? ''}`
          .toLowerCase()
          .includes(needle),
      )
    : accounts;

  const toggle = (account: (typeof accounts)[number]) => {
    const isSelected = selected.some(
      (attendee) => attendee.userId === account.uid,
    );

    if (isSelected) {
      onChange(selected.filter((attendee) => attendee.userId !== account.uid));
      return;
    }

    onChange([
      ...selected,
      {
        userId: account.uid,
        name:
          account.displayName?.trim() ||
          account.email ||
          t('account.profile.anonymous'),
        status: 'invited',
      },
    ]);
  };

  return (
    <SheetFrame
      title={t('meeting.form.invite')}
      testID="meeting-attendee-sheet"
      onClose={onClose}
    >
      <Input
        testID="meeting-attendee-search"
        value={search}
        onChangeText={setSearch}
        placeholder={t('meeting.form.searchMembers')}
        accessibilityLabel={t('meeting.form.searchMembers')}
        autoCapitalize="none"
      />

      {query.isPending ? (
        <View className="items-center py-10">
          <Spinner size="lg" label={t('action.loading')} />
        </View>
      ) : query.isError ? (
        <ErrorState
          title={t('state.errorTitle')}
          description={t('state.errorDescription')}
          onRetry={query.refetch}
        />
      ) : visible.length === 0 ? (
        <Text variant="caption" tone="muted" className="py-6 text-center">
          {t('meeting.form.noMembers')}
        </Text>
      ) : (
        <ScrollView
          style={{ maxHeight: Math.max(180, window.height * 0.42) }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-1"
        >
          {visible.map((account) => {
            const isSelected = selected.some(
              (attendee) => attendee.userId === account.uid,
            );
            const name =
              account.displayName?.trim() ||
              account.email ||
              t('account.profile.anonymous');

            return (
              <Pressable
                key={account.uid}
                testID={`meeting-attendee:${account.uid}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={name}
                onPress={() => toggle(account)}
                className="min-h-14 flex-row items-center gap-3 rounded-lg px-2 py-2 active:bg-muted/60"
              >
                <Avatar size="md" src={account.photoURL} name={name} />
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text variant="label" numberOfLines={1}>
                    {name}
                  </Text>
                  {account.email ? (
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {account.email}
                    </Text>
                  ) : null}
                </View>
                <View
                  className={cn(
                    'h-6 w-6 items-center justify-center rounded-full border',
                    isSelected
                      ? 'border-primary bg-primary'
                      : 'border-input bg-transparent',
                  )}
                >
                  {isSelected ? (
                    <Icon name="check" size={14} tone="primary-foreground" />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <Button
        label={t('action.done')}
        testID="meeting-attendee-done"
        onPress={onClose}
      />
    </SheetFrame>
  );
}
