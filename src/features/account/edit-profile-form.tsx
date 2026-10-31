import { Host, Picker } from '@expo/ui';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
  View,
} from 'react-native';
import type { AccountProfile } from '@/core/domain/account/merge-profile';
import {
  isProfileDraftDirty,
  normalizePhoneNumber,
  toProfileDraft,
  validateProfileDraft,
} from '@/core/domain/account/profile-validation';
import type { AccountData, UserRole } from '@/core/types';
import { Avatar } from '@/ui/avatar';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Text } from '@/ui/text';
import { ASSIGNABLE_ROLES, canEditRoles, roleLabelKey } from './role-label';
import { useUpdateAccount } from './use-account';

/**
 * Profile edit form.
 *
 * Deliberately **not** using `@expo/ui` `TextInput`: that control is backed by an
 * `ObservableState` and worklets, so its value does not participate in React
 * state. A form that has to keep an invalid draft on screen after a failed save
 * needs a plain controlled input, so the app's `Input` is used for text and
 * `@expo/ui` supplies the one genuinely native picker (role, administrators
 * only). The deviation is recorded in `MIGRATE.md`.
 *
 * Draft rules:
 *  - nothing is written until Save succeeds, so Cancel is a no-op;
 *  - a failed save keeps every field exactly as typed;
 *  - Save is enabled only for a dirty, valid draft;
 *  - while pending the fields, Cancel and Save are disabled — the route also
 *    prevents dismissal, so the write cannot be orphaned by a swipe.
 */
export type EditProfileFormProps = {
  account: AccountData;
  /** Called whenever the write starts or settles, so the route can block dismissal. */
  onPendingChange: (pending: boolean) => void;
  /** Must be stable: the form calls it once, from an effect. */
  onSaved: () => void;
  onCancel: () => void;
};

export function EditProfileForm({
  account,
  onPendingChange,
  onSaved,
  onCancel,
}: EditProfileFormProps) {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const update = useUpdateAccount(account.uid);

  const [draft, setDraft] = useState(() => toProfileDraft(account));
  const [photoURL, setPhotoURL] = useState(account.photoURL ?? null);
  const [role, setRole] = useState<UserRole>(account.role ?? 'user');
  const [photoError, setPhotoError] = useState(false);
  const [saved, setSaved] = useState(false);
  // Closing is a one-shot side effect. A ref, not state: this must not trigger
  // a render, and it must survive the parent re-rendering with a new callback
  // identity — a second `back()` would pop the screen underneath the sheet.
  const closed = useRef(false);

  useEffect(() => {
    onPendingChange(update.isPending);
  }, [onPendingChange, update.isPending]);

  // Navigate only after the mutation has settled. Calling `router.back()` from
  // `onSuccess` would race the pending flag the route uses to block dismissal.
  useEffect(() => {
    if (!saved || update.isPending || closed.current) return;

    closed.current = true;
    onSaved();
  }, [onSaved, saved, update.isPending]);

  const errors = validateProfileDraft(draft);
  const roleEditable = canEditRoles(account.role);
  const roleChanged = roleEditable && role !== (account.role ?? 'user');
  const photoChanged = photoURL !== (account.photoURL ?? null);
  const dirty =
    isProfileDraftDirty(draft, account) || roleChanged || photoChanged;
  const valid = Object.keys(errors).length === 0;
  const canSave = dirty && valid && !update.isPending;

  const nameEdited =
    draft.displayName.trim() !== (account.displayName ?? '').trim();
  const phoneEdited =
    normalizePhoneNumber(draft.phoneNumber.trim()) !==
    normalizePhoneNumber((account.phoneNumber ?? '').trim());

  const nameError =
    nameEdited && errors.displayName
      ? errors.displayName === 'required'
        ? t('account.validation.displayNameRequired')
        : t('account.validation.displayNameLength')
      : null;
  const phoneError =
    phoneEdited && errors.phoneNumber ? t('account.validation.phone') : null;

  const clearFailure = () => {
    if (update.isError) update.reset();
  };

  const setDisplayName = (value: string) => {
    clearFailure();
    setDraft((current) => ({ ...current, displayName: value }));
  };

  const setPhoneNumber = (value: string) => {
    clearFailure();
    setDraft((current) => ({ ...current, phoneNumber: value }));
  };

  const setSelectedRole = (value: UserRole) => {
    clearFailure();
    setRole(value);
  };

  const pickPhoto = async () => {
    setPhotoError(false);
    clearFailure();

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (asset) setPhotoURL(asset.uri);
    } catch {
      setPhotoError(true);
    }
  };

  const handleSave = () => {
    if (!canSave) return;

    const patch: Partial<AccountProfile> = {};

    const displayName = draft.displayName.trim();
    if (displayName !== (account.displayName ?? '').trim()) {
      patch.displayName = displayName;
    }

    const phoneNumber = normalizePhoneNumber(draft.phoneNumber.trim());
    if (
      phoneNumber !== normalizePhoneNumber((account.phoneNumber ?? '').trim())
    ) {
      // An empty field clears the stored number rather than writing "" — the
      // difference matters to a form that renders `?? ''`.
      patch.phoneNumber = phoneNumber.length > 0 ? phoneNumber : null;
    }

    if (roleChanged) patch.role = role;
    if (photoChanged) patch.photoURL = photoURL;

    update.mutate(patch, {
      onSuccess: () => setSaved(true),
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="bg-background flex-1"
    >
      <View className="border-border flex-row items-center gap-2 border-b px-4 py-2">
        <View className="flex-1 items-start">
          <Button
            variant="ghost"
            label={t('action.cancel')}
            onPress={onCancel}
            disabled={update.isPending}
            testID="account-edit-cancel"
          />
        </View>
        <Text variant="subtitle" numberOfLines={1}>
          {t('account.edit.title')}
        </Text>
        {/* Balances the cancel button so the title stays centred. */}
        <View className="flex-1" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 p-4 pb-8"
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center gap-2">
          <Avatar
            size="xl"
            src={photoURL}
            name={draft.displayName}
            accessibilityLabel={t('account.a11y.profilePhoto')}
          />
          <Button
            variant="ghost"
            size="sm"
            label={t('account.edit.photo')}
            onPress={() => void pickPhoto()}
            disabled={update.isPending}
            testID="account-change-photo"
          />
          <Text
            variant="caption"
            tone={photoError ? 'destructive' : 'muted'}
            className="text-center"
            accessibilityRole={photoError ? 'alert' : undefined}
          >
            {photoError
              ? t('account.edit.photoFailed')
              : t('account.edit.photoHint')}
          </Text>
        </View>

        <View className="gap-1.5">
          <Text variant="label">{t('account.edit.displayName')}</Text>
          <Input
            value={draft.displayName}
            onChangeText={setDisplayName}
            placeholder={t('account.edit.displayNamePlaceholder')}
            invalid={nameError !== null}
            editable={!update.isPending}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            maxLength={80}
            testID="account-name-input"
          />
          {nameError ? (
            <Text
              variant="caption"
              tone="destructive"
              accessibilityRole="alert"
            >
              {nameError}
            </Text>
          ) : null}
        </View>

        <View className="gap-1.5">
          <Text variant="label">{t('account.edit.email')}</Text>
          <Input
            value={account.email ?? ''}
            editable={false}
            className="opacity-70"
            testID="account-email-input"
          />
          <Text variant="caption" tone="muted">
            {t('account.edit.emailHint')}
          </Text>
        </View>

        <View className="gap-1.5">
          <Text variant="label">{t('account.edit.phone')}</Text>
          <Input
            value={draft.phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder={t('account.edit.phonePlaceholder')}
            invalid={phoneError !== null}
            editable={!update.isPending}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={24}
            testID="account-phone-input"
          />
          {phoneError ? (
            <Text
              variant="caption"
              tone="destructive"
              accessibilityRole="alert"
            >
              {phoneError}
            </Text>
          ) : (
            <Text variant="caption" tone="muted">
              {t('account.edit.phoneHint')}
            </Text>
          )}
        </View>

        {roleEditable ? (
          <View className="gap-1.5">
            <Text variant="label">{t('account.edit.role')}</Text>
            <Host
              matchContents={{ vertical: true }}
              colorScheme={scheme ?? 'dark'}
            >
              <Picker
                selectedValue={role}
                onValueChange={(value) => setSelectedRole(value as UserRole)}
                enabled={!update.isPending}
                testID="account-role-picker"
              >
                {ASSIGNABLE_ROLES.map((option) => (
                  <Picker.Item
                    key={option}
                    label={t(roleLabelKey(option))}
                    value={option}
                  />
                ))}
              </Picker>
            </Host>
          </View>
        ) : (
          <View className="gap-1.5">
            <Text variant="label">{t('account.edit.role')}</Text>
            <Badge variant="outline" label={t(roleLabelKey(account.role))} />
            <Text variant="caption" tone="muted">
              {t('account.edit.roleHint')}
            </Text>
          </View>
        )}

        {update.isError ? (
          <Text variant="caption" tone="destructive" accessibilityRole="alert">
            {t('account.edit.saveFailed')}
          </Text>
        ) : null}
      </ScrollView>

      {/*
        Outside the scroll view: the keyboard may cover the bottom of the form,
        but the action that ends the form must stay reachable. This is the
        "keyboard never covers Save" requirement.
      */}
      <View className="border-border bg-background border-t p-4">
        <Button
          label={update.isPending ? t('account.edit.saving') : t('action.save')}
          onPress={handleSave}
          disabled={!canSave}
          testID="account-edit-save"
        />
      </View>
    </KeyboardAvoidingView>
  );
}
