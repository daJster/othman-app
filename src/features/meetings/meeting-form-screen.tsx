import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Meeting } from '@/core/types';
import { api, backendMessageKey, useApiMutation, useApiQuery } from '@/api';
import { useDirection } from '@/i18n';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { PageHeader } from '@/ui/page-header';
import { useToast } from '@/ui/panel';
import { Text } from '@/ui/text';
import { Textarea } from '@/ui/textarea';
import { EmptyState, ErrorState, Loading } from '@/ui/states';
import {
  createEmptyDraft,
  isMeetingDraftDirty,
  toMeetingDraft,
  toMeetingInput,
  validateMeetingDraft,
  type MeetingDraft,
  type MeetingField,
} from './meeting-form';
// Expo Router 57 does not re-export this hook yet (it becomes public in SDK 58),
// but the native stack already ships the implementation. The deep import keeps
// a save in progress from being orphaned by a swipe-down or the Android back
// button. Replace it with the barrel import when the SDK exposes it.
import { usePreventRemove } from 'expo-router/build/react-navigation/core/usePreventRemove';

/**
 * Create or edit a session.
 *
 * One form for both jobs: the fields, the validation and the failure copy are
 * identical, and only the verb changes. `id` decides, so the route stays a
 * single sheet rather than two nearly-twin screens.
 *
 * The draft is local until Save succeeds. Cancel (or a swipe while idle) is a
 * true discard; a failed write keeps every field exactly as typed, because
 * retyping a description to retry a network failure is the kind of small
 * cruelty that makes a form feel unreliable.
 *
 * Language: the form shows and writes the values the reader will see in the
 * current interface language, and mirrors them into both stored variants. The
 * demo data is bilingual, but a single shaykh editing one title should not have
 * to fill the same sentence twice — or discover that their Arabic edit is
 * invisible in English.
 */
export type MeetingFormScreenProps = {
  /** `null` creates; a real id edits. */
  id: number | null;
};

export function MeetingFormScreen({ id }: MeetingFormScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const editing = id !== null;
  const query = useApiQuery(api.demo.meetings.byId, { id });
  const title = editing
    ? t('meeting.form.editTitle')
    : t('meeting.form.createTitle');

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/meetings');
  }, [router]);

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
          description={t('state.errorDescription')}
          onRetry={query.refetch}
        />
      </FormShell>
    );
  }

  const meeting = editing ? (query.data?.meeting ?? null) : null;

  if (editing && !meeting) {
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
    <MeetingForm key={meeting?.id ?? 'new'} meeting={meeting} onLeave={leave} />
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
            testID="meeting-form-cancel"
          />
        }
      />
      {children}
    </View>
  );
}

function MeetingForm({
  meeting,
  onLeave,
}: {
  meeting: Meeting | null;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const create = useApiMutation(api.demo.meetings.create);
  const update = useApiMutation(api.demo.meetings.update);
  const pending = create.isPending || update.isPending;
  const failure = create.error ?? update.error;

  const [draft, setDraft] = useState<MeetingDraft>(() =>
    meeting ? toMeetingDraft(meeting, language) : createEmptyDraft(),
  );
  const [showErrors, setShowErrors] = useState(false);
  const [saved, setSaved] = useState(false);
  const handled = useRef(false);

  usePreventRemove(pending, () => {
    // Intentionally quiet: the sheet snapping back is the feedback.
  });

  const finish = useCallback(() => {
    if (handled.current) return;
    handled.current = true;
    onLeave();
  }, [onLeave]);

  /*
   * Navigate only after the write has settled.
   *
   * `usePreventRemove` is armed while the mutation is pending, so calling
   * `router.back()` from `onSuccess` would be intercepted: the request is done
   * but `isPending` has not flipped yet, and the sheet simply stays open. The
   * effect waits for that last render.
   */
  useEffect(() => {
    if (saved && !pending) finish();
  }, [finish, pending, saved]);

  const errors = validateMeetingDraft(draft);
  const dirty =
    meeting === null
      ? (Object.keys(draft) as MeetingField[]).some(
          (field) => draft[field].trim() !== createEmptyDraft()[field],
        )
      : isMeetingDraftDirty(draft, meeting, language);
  const valid = Object.keys(errors).length === 0;

  const setField = (field: MeetingField, value: string) => {
    if (failure) {
      create.reset();
      update.reset();
    }
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const save = () => {
    if (pending) return;

    if (!valid) {
      setShowErrors(true);
      return;
    }

    const input = toMeetingInput(draft);

    if (meeting) {
      update.mutate(
        { id: meeting.id, patch: input },
        {
          onSuccess: () => {
            toast.show(t('meeting.form.updated'), { tone: 'success' });
            setSaved(true);
          },
        },
      );
      return;
    }

    create.mutate(input, {
      onSuccess: () => {
        toast.show(t('meeting.form.created'), { tone: 'success' });
        setSaved(true);
      },
    });
  };

  const errorFor = (field: MeetingField) =>
    showErrors || dirty ? errors[field] : undefined;

  const title = meeting
    ? t('meeting.form.editTitle')
    : t('meeting.form.createTitle');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
      testID="meeting-form"
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
            testID="meeting-form-cancel"
          />
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="mx-auto w-full max-w-xl gap-5 p-4 pb-8"
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="caption" tone="muted">
          {meeting
            ? t('meeting.form.editDescription')
            : t('meeting.form.createDescription')}
        </Text>

        <Field
          label={t('meeting.form.title')}
          hint={t('meeting.form.languageHint')}
          error={errorFor('title') ? t(errorFor('title')!) : null}
        >
          <Input
            testID="meeting-title-input"
            value={draft.title}
            onChangeText={(value) => setField('title', value)}
            placeholder={t('meeting.form.titlePlaceholder')}
            accessibilityLabel={t('meeting.form.title')}
            editable={!pending}
            invalid={Boolean(errorFor('title'))}
            maxLength={200}
            autoFocus={Platform.OS === 'web'}
          />
        </Field>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field
              label={t('meeting.form.date')}
              hint={t('meeting.form.dateHint')}
              error={errorFor('date') ? t(errorFor('date')!) : null}
            >
              <Input
                testID="meeting-date-input"
                value={draft.date}
                onChangeText={(value) => setField('date', value)}
                placeholder="2026-11-11"
                accessibilityLabel={t('meeting.form.date')}
                editable={!pending}
                invalid={Boolean(errorFor('date'))}
                autoCapitalize="none"
                maxLength={10}
              />
            </Field>
          </View>

          <View className="w-28">
            <Field
              label={t('meeting.form.time')}
              hint={t('meeting.form.timeHint')}
              error={errorFor('time') ? t(errorFor('time')!) : null}
            >
              <Input
                testID="meeting-time-input"
                value={draft.time}
                onChangeText={(value) => setField('time', value)}
                placeholder="18:00"
                accessibilityLabel={t('meeting.form.time')}
                editable={!pending}
                invalid={Boolean(errorFor('time'))}
                autoCapitalize="none"
                maxLength={5}
              />
            </Field>
          </View>
        </View>

        <View className="w-32">
          <Field
            label={t('meeting.form.duration')}
            error={
              errorFor('durationMinutes')
                ? t(errorFor('durationMinutes')!)
                : null
            }
          >
            <Input
              testID="meeting-duration-input"
              value={draft.durationMinutes}
              onChangeText={(value) => setField('durationMinutes', value)}
              placeholder="60"
              accessibilityLabel={t('meeting.form.duration')}
              editable={!pending}
              invalid={Boolean(errorFor('durationMinutes'))}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={4}
            />
          </Field>
        </View>

        <Field
          label={t('meeting.form.location')}
          optional={t('meeting.form.optional')}
        >
          <Input
            testID="meeting-location-input"
            value={draft.location}
            onChangeText={(value) => setField('location', value)}
            placeholder={t('meeting.form.locationPlaceholder')}
            accessibilityLabel={t('meeting.form.location')}
            editable={!pending}
            maxLength={200}
          />
        </Field>

        <Field
          label={t('meeting.form.meetLink')}
          hint={t('meeting.form.meetLinkHint')}
          optional={t('meeting.form.optional')}
          error={errorFor('meetLink') ? t(errorFor('meetLink')!) : null}
        >
          <Input
            testID="meeting-link-input"
            value={draft.meetLink}
            onChangeText={(value) => setField('meetLink', value)}
            placeholder="https://meet.google.com/…"
            accessibilityLabel={t('meeting.form.meetLink')}
            editable={!pending}
            invalid={Boolean(errorFor('meetLink'))}
            autoCapitalize="none"
            inputMode="url"
            maxLength={2048}
          />
        </Field>

        <Field
          label={t('meeting.form.organizer')}
          optional={t('meeting.form.optional')}
        >
          <Input
            testID="meeting-organizer-input"
            value={draft.organizer}
            onChangeText={(value) => setField('organizer', value)}
            accessibilityLabel={t('meeting.form.organizer')}
            editable={!pending}
            maxLength={200}
          />
        </Field>

        <Field
          label={t('meeting.form.description')}
          optional={t('meeting.form.optional')}
        >
          <Textarea
            testID="meeting-description-input"
            value={draft.description}
            onChangeText={(value) => setField('description', value)}
            placeholder={t('meeting.form.descriptionPlaceholder')}
            accessibilityLabel={t('meeting.form.description')}
            editable={!pending}
            maxLength={5000}
          />
        </Field>

        {failure ? (
          <Text
            variant="caption"
            tone="destructive"
            accessibilityRole="alert"
            testID="meeting-form-error"
          >
            {t(backendMessageKey(failure))}
          </Text>
        ) : null}
      </ScrollView>

      <View
        className="border-t border-glass-edge bg-glass px-4 pt-3"
        style={{ paddingBottom: Math.max(16, insets.bottom) }}
      >
        <View className="mx-auto w-full max-w-xl">
          <Button
            label={
              pending
                ? t('meeting.form.saving')
                : meeting
                  ? t('meeting.form.save')
                  : t('meeting.form.create')
            }
            onPress={save}
            disabled={pending || (!dirty && meeting !== null)}
            testID="meeting-save"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * Label, optional marker, one hint/error line, then the control.
 *
 * Errors replace the hint rather than stacking under it: two muted lines under
 * one field is noise, and the error is the one that matters.
 */
function Field({
  label,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  optional?: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-baseline gap-2">
        <Text variant="label">{label}</Text>
        {optional ? (
          <Text variant="caption" tone="muted">
            {optional}
          </Text>
        ) : null}
      </View>
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
