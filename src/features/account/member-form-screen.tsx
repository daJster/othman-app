import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  api,
  backendMessageKey,
  isDuplicateAccount,
  useApiMutation,
  useApiQuery,
  type BackendUser,
} from '@/api';
import { useSessionRole } from '@/features/auth/use-session-role';
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
import { Badge } from '@/ui/badge';
import { Button, ButtonText } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import { PageHeader } from '@/ui/page-header';
import { Switch, useToast } from '@/ui/panel';
import { Text } from '@/ui/text';
import { EmptyState, ErrorState, Loading } from '@/ui/states';
import {
  ASSIGNABLE_MEMBER_ROLES,
  createEmptyMemberDraft,
  isMemberDraftDirty,
  memberName,
  toCreateMemberInput,
  toMemberDraft,
  toUpdateMemberPatch,
  validateMemberDraft,
  type MemberDraft,
  type MemberField,
  type MemberRole,
} from './member-form';
import { roleLabelKey } from './role-label';
// Expo Router 57 does not re-export this hook yet (it becomes public in SDK 58),
// but the native stack already ships the implementation. The deep import keeps
// a save in progress from being orphaned by a swipe-down or the Android back
// button.
import { usePreventRemove } from 'expo-router/build/react-navigation/core/usePreventRemove';

/**
 * Create or edit one account.
 *
 * A member is an identity plus an authorisation, so the form has two halves:
 * the person (name, phone, email) and the access (role, sign-in). They are one
 * column with a hairline between them rather than tabs — an administrator
 * editing a shaykh's role is still looking at the shaykh.
 *
 * What the current session may do is decided before the fields render:
 *
 *  - only a superadmin sees "superadmin" as a choice, and only a superadmin can
 *    change a superadmin's role;
 *  - nobody can change their own role or disable their own sign-in (the server
 *    refuses, and a control that always fails is worse than no control);
 *  - delete follows the server's hierarchy: admins remove students, superadmins
 *    remove anyone but themselves.
 */
export type MemberFormScreenProps = {
  uid: string | null;
};

export function MemberFormScreen({ uid }: MemberFormScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const editing = uid !== null;
  const query = useApiQuery(api.demo.accounts.byUid, { uid });
  const title = editing
    ? t('members.form.editTitle')
    : t('members.form.createTitle');

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/admin/members');
  };

  if (editing && query.isPending) {
    return (
      <FormShell title={title} onCancel={leave}>
        <Loading label={t('action.loading')} />
      </FormShell>
    );
  }

  if (editing && query.isError) {
    return (
      <FormShell title={title} onCancel={leave}>
        <ErrorState
          title={t('state.errorTitle')}
          description={t(backendMessageKey(query.error))}
          onRetry={query.refetch}
        />
      </FormShell>
    );
  }

  const account = editing ? (query.data?.account ?? null) : null;

  if (editing && !account) {
    return (
      <FormShell title={title} onCancel={leave}>
        <EmptyState
          title={t('backend.error.notFound')}
          description={t('state.emptyDescription')}
          actionLabel={t('action.back')}
          onAction={leave}
        />
      </FormShell>
    );
  }

  return (
    <MemberForm key={account?.uid ?? 'new'} account={account} onLeave={leave} />
  );
}

function FormShell({
  title,
  onCancel,
  children,
}: {
  title: string;
  onCancel: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-background">
      <PageHeader
        title={title}
        start={
          <Button
            variant="ghost"
            label={t('action.cancel')}
            onPress={onCancel}
            testID="member-form-cancel"
          />
        }
      />
      {children}
    </View>
  );
}

function MemberForm({
  account,
  onLeave,
}: {
  account: BackendUser | null;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const session = useSessionRole();
  const create = useApiMutation(api.demo.accounts.create);
  const update = useApiMutation(api.demo.accounts.update);
  const remove = useApiMutation(api.demo.accounts.remove);

  const editing = account !== null;
  const isSelf = account !== null && account.uid === session.uid;
  const pending = create.isPending || update.isPending || remove.isPending;
  const failure = create.error ?? update.error ?? remove.error;

  const [draft, setDraft] = useState<MemberDraft>(() =>
    account ? toMemberDraft(account) : createEmptyMemberDraft(),
  );
  const [showErrors, setShowErrors] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const handled = useRef(false);

  usePreventRemove(pending, () => {
    // Intentionally quiet: the sheet snapping back is the feedback.
  });

  const mode = editing ? 'edit' : 'create';
  const errors = validateMemberDraft(draft, mode);
  const valid = Object.keys(errors).length === 0;
  const dirty = account ? isMemberDraftDirty(draft, account) : true;

  const roleEditable =
    !isSelf && (account?.role !== 'superadmin' || session.isSuperadmin);

  const roleOptions = session.isSuperadmin
    ? ASSIGNABLE_MEMBER_ROLES
    : ASSIGNABLE_MEMBER_ROLES.filter((role) => role !== 'superadmin');

  const canDelete =
    editing &&
    !isSelf &&
    (session.isSuperadmin || (session.isAdmin && account.role === 'user'));

  const title = editing
    ? t('members.form.editTitle')
    : t('members.form.createTitle');

  const finish = () => {
    if (handled.current) return;
    handled.current = true;
    onLeave();
  };

  /*
   * Navigate only after the write has settled. The dismissal guard is armed
   * while the mutation is pending, so leaving from `onSuccess` would be
   * intercepted one render before `isPending` flips false.
   */
  useEffect(() => {
    if (saved && !pending) finish();
    // `finish` is a render-local closure by design; the guard ref makes it
    // idempotent, so only the save/pending transition matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, saved]);

  const setField = (field: MemberField, value: string) => {
    if (failure) {
      create.reset();
      update.reset();
    }
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const setRole = (role: MemberRole) => {
    if (!roleEditable) return;
    if (failure) update.reset();
    setDraft((current) => ({ ...current, role }));
  };

  const save = () => {
    if (pending) return;

    if (!valid) {
      setShowErrors(true);
      return;
    }

    if (account) {
      update.mutate(
        { uid: account.uid, patch: toUpdateMemberPatch(draft, account) },
        {
          onSuccess: () => {
            toast.show(t('members.form.updated'), { tone: 'success' });
            setSaved(true);
          },
        },
      );
      return;
    }

    create.mutate(toCreateMemberInput(draft), {
      onSuccess: () => {
        toast.show(t('members.form.created'), { tone: 'success' });
        setSaved(true);
      },
    });
  };

  const deleteMember = () => {
    if (!account) return;

    remove.mutate(
      { uid: account.uid },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          toast.show(t('members.form.deleted'), { tone: 'success' });
          setSaved(true);
        },
        onError: () => setConfirmOpen(false),
      },
    );
  };

  const errorFor = (field: MemberField) =>
    showErrors || (editing && dirty) ? errors[field] : undefined;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
      testID="member-form"
    >
      <Head>
        <title>{`${title} · ${t('app.name')}`}</title>
      </Head>

      <PageHeader
        title={title}
        start={
          <Button
            variant="ghost"
            label={t('action.cancel')}
            onPress={onLeave}
            disabled={pending}
            testID="member-form-cancel"
          />
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="mx-auto w-full max-w-xl gap-5 p-4 pb-8"
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="caption" tone="muted">
          {editing
            ? t('members.form.editDescription')
            : t('members.form.createDescription')}
        </Text>

        <Field
          label={t('members.form.displayName')}
          error={errorFor('displayName') ? t(errorFor('displayName')!) : null}
        >
          <Input
            testID="member-name-input"
            value={draft.displayName}
            onChangeText={(value) => setField('displayName', value)}
            placeholder={t('members.form.displayNamePlaceholder')}
            accessibilityLabel={t('members.form.displayName')}
            editable={!pending}
            invalid={Boolean(errorFor('displayName'))}
            autoCapitalize="words"
            autoComplete="name"
            maxLength={60}
            autoFocus={!editing && Platform.OS === 'web'}
          />
        </Field>

        <Field
          label={t('members.form.email')}
          hint={editing ? undefined : t('members.form.emailHint')}
          error={errorFor('email') ? t(errorFor('email')!) : null}
        >
          <Input
            testID="member-email-input"
            value={draft.email}
            onChangeText={(value) => setField('email', value)}
            accessibilityLabel={t('members.form.email')}
            editable={!editing && !pending}
            invalid={Boolean(errorFor('email'))}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            className={editing ? 'opacity-70' : undefined}
          />
        </Field>

        {!editing ? (
          <Field
            label={t('members.form.password')}
            hint={t('members.form.passwordHint')}
            error={errorFor('password') ? t(errorFor('password')!) : null}
          >
            <Input
              testID="member-password-input"
              value={draft.password}
              onChangeText={(value) => setField('password', value)}
              accessibilityLabel={t('members.form.password')}
              editable={!pending}
              invalid={Boolean(errorFor('password'))}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
            />
          </Field>
        ) : null}

        <Field label={t('members.form.phone')}>
          <Input
            testID="member-phone-input"
            value={draft.phoneNumber}
            onChangeText={(value) => setField('phoneNumber', value)}
            placeholder={t('members.form.phonePlaceholder')}
            accessibilityLabel={t('members.form.phone')}
            editable={!pending}
            keyboardType="phone-pad"
            autoComplete="tel"
            inputMode="tel"
            maxLength={24}
          />
        </Field>

        <View className="gap-2 border-t border-border pt-4">
          <Text variant="overline" className="text-brass-ink">
            {t('members.filters')}
          </Text>

          {roleEditable ? (
            <View
              className="flex-row flex-wrap gap-2"
              accessibilityRole="radiogroup"
              accessibilityLabel={t('members.form.role')}
            >
              {roleOptions.map((role) => {
                const selected = role === draft.role;

                return (
                  <Button
                    key={role}
                    testID={`member-role:${role}`}
                    size="sm"
                    variant={selected ? 'secondary' : 'ghost'}
                    label={t(roleLabelKey(role))}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => setRole(role)}
                    disabled={pending}
                    className="border border-border"
                  />
                );
              })}
            </View>
          ) : (
            <Badge
              variant="outline"
              label={t(roleLabelKey(account?.role ?? draft.role))}
            />
          )}

          <Text variant="caption" tone="muted">
            {isSelf ? t('members.form.selfHint') : t('members.form.roleHint')}
          </Text>
        </View>

        {editing && !isSelf ? (
          <View className="flex-row items-center gap-3 border-t border-border pt-4">
            <View className="flex-1 gap-0.5">
              <Text variant="label">{t('members.form.disabled')}</Text>
              <Text variant="caption" tone="muted">
                {t('members.form.disabledHint')}
              </Text>
            </View>
            <Switch
              testID="member-disabled-switch"
              checked={draft.disabled}
              onCheckedChange={(checked) =>
                setDraft((current) => ({ ...current, disabled: checked }))
              }
              disabled={pending}
              accessibilityLabel={t('members.form.disabled')}
            />
          </View>
        ) : null}

        {failure ? (
          <Text
            variant="caption"
            tone="destructive"
            accessibilityRole="alert"
            testID="member-form-error"
          >
            {isDuplicateAccount(failure)
              ? t('backend.error.exists')
              : t(backendMessageKey(failure))}
          </Text>
        ) : null}

        {canDelete ? (
          <View className="gap-2 border-t border-border pt-4">
            <Button
              variant="ghost"
              onPress={() => setConfirmOpen(true)}
              disabled={pending}
              className="self-start"
              testID="member-delete"
            >
              <Icon name="trash" size={16} tone="destructive" />
              <ButtonText variant="ghost" className="text-destructive">
                {t('members.form.delete')}
              </ButtonText>
            </Button>
          </View>
        ) : null}
      </ScrollView>

      <View
        className="border-t border-border bg-background px-4 pt-3"
        style={{ paddingBottom: Math.max(16, insets.bottom) }}
      >
        <View className="mx-auto w-full max-w-xl">
          <Button
            label={
              pending
                ? t('members.form.saving')
                : editing
                  ? t('action.save')
                  : t('members.form.create')
            }
            onPress={save}
            disabled={pending || (editing && !dirty)}
            testID="member-save"
          />
        </View>
      </View>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('members.form.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('members.form.deleteMessage', {
                name: account ? memberName(account) : '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="h-11"
              onPress={() => setConfirmOpen(false)}
            >
              <Text>{t('action.cancel')}</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-11 bg-destructive"
              onPress={deleteMember}
              disabled={remove.isPending}
              testID="member-delete-confirm"
            >
              <Text className="text-destructive-foreground">
                {t('members.form.delete')}
              </Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <View className="gap-2">
      <Text variant="label">{label}</Text>
      {children}
      {error ? (
        <Text variant="caption" tone="destructive" accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
