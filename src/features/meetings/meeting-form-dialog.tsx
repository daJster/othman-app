import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';
import type { DateKey, Meeting } from '@/core/types';
import { parseDateKey } from '@/core/domain/meetings/date-key';
import { api, backendMessageKey, useApiMutation } from '@/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDirection } from '@/i18n';
import { useAuth } from '@/providers/auth-context';
import { Button } from '@/ui/button';
import { cn } from '@/ui/cn';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import { Steps, useToast, type StepItem } from '@/ui/panel';
import { Pressable } from '@/ui/pressable';
import { Separator } from '@/ui/separator';
import { Text } from '@/ui/text';
import { Textarea } from '@/ui/textarea';
import { formatClockTime, formatDayMonth } from './calendar-format';
import { AttendeeSheet } from './meeting-form-sheets';
import { DateSheet, TimeSheet } from './meeting-pickers';
import {
  createEmptyDraft,
  DURATION_STEPS,
  isMeetingDraftDirty,
  toMeetingDraft,
  toMeetingInput,
  validateMeetingDraft,
  type MeetingDraft,
  type MeetingField,
} from './meeting-form';

/**
 * Create or edit a session, in the shared glass dialog.
 *
 * The form used to be a `formSheet` route — a bottom drawer covering the tab.
 * A session is a short, focused task with a clear finish, so it belongs in a
 * dialog that keeps the calendar behind it and can be dismissed without
 * changing routes.
 *
 * It is split into the three answers a shaykh actually gives: what the session
 * is, when it is, and who it is for. The dialog holds its size while the phase
 * content crossfades, so moving through the steps reads as one surface
 * changing rather than three panels replacing each other.
 *
 * Dates and times come from pickers instead of format strings, the duration is
 * a looping set of real lengths (30 min → 1 h → 1 h 30 → 2 h → all day), and
 * the people it concerns are chosen from the cohort rather than typed. The
 * payload carries those invitations, which is what makes the scoped meeting
 * list show the session to the students it belongs to.
 *
 * The draft is local until Save succeeds. Closing is a true discard; a failed
 * write keeps every field exactly as typed.
 */
export type MeetingFormDialogProps = {
  open: boolean;
  /** The meeting being edited, or null to create. */
  meeting: Meeting | null;
  onClose: () => void;
};

export function MeetingFormDialog({
  open,
  meeting,
  onClose,
}: MeetingFormDialogProps) {
  const { width, height } = useWindowDimensions();
  const dialogWidth = Math.min(width - 24, 512);
  const dialogMaxHeight = Math.max(420, height - 96);

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent
        testID="meeting-form-dialog"
        className="max-w-lg"
        style={{ width: dialogWidth, maxHeight: dialogMaxHeight }}
      >
        <MeetingFormBody meeting={meeting} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

/** The five planned lengths, plus a graceful label for a legacy custom value. */
function durationLabel(minutes: number, t: TFunction): string {
  switch (minutes) {
    case 30:
      return t('meeting.form.duration30');
    case 60:
      return t('meeting.form.duration60');
    case 90:
      return t('meeting.form.duration90');
    case 120:
      return t('meeting.form.duration120');
    case 1440:
      return t('meeting.form.duration1440');
    default:
      return t('meeting.form.durationCustom', { count: minutes });
  }
}

function MeetingFormBody({
  meeting,
  onClose,
}: {
  meeting: Meeting | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const { user } = useAuth();
  const { height } = useWindowDimensions();
  const toast = useToast();
  const create = useApiMutation(api.demo.meetings.create);
  const update = useApiMutation(api.demo.meetings.update);
  const pending = create.isPending || update.isPending;
  const failure = create.error ?? update.error;

  const [draft, setDraft] = useState<MeetingDraft>(() => {
    if (meeting) return toMeetingDraft(meeting, language);

    const empty = createEmptyDraft();

    return { ...empty, organizer: user?.displayName ?? '' };
  });
  const [phase, setPhase] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [touched, setTouched] = useState<ReadonlySet<MeetingField>>(
    () => new Set(),
  );
  const [saved, setSaved] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [attendeesOpen, setAttendeesOpen] = useState(false);
  const closed = useRef(false);

  /*
   * Close only after the write has settled. `isPending` flips after the
   * mutation callback, and closing on the callback would unmount the dialog
   * before the toast and the cache invalidation had a frame to land.
   */
  useEffect(() => {
    if (!saved || pending || closed.current) return;

    closed.current = true;
    onClose();
  }, [onClose, pending, saved]);

  const errors = validateMeetingDraft(draft);
  const dirty =
    meeting === null
      ? (Object.keys(draft) as MeetingField[]).some((field) =>
          field === 'attendees'
            ? draft.attendees.length > 0
            : draft[field].trim() !== createEmptyDraft()[field].trim(),
        )
      : isMeetingDraftDirty(draft, meeting, language);
  const valid = Object.keys(errors).length === 0;

  const markTouched = (field: MeetingField) => {
    setTouched((current) => {
      if (current.has(field)) return current;

      const next = new Set(current);
      next.add(field);

      return next;
    });
  };

  const setField = (
    field: Exclude<MeetingField, 'attendees'>,
    value: string,
  ) => {
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

      if (errors.title) {
        setPhase(0);
      } else if (errors.date || errors.time || errors.durationMinutes) {
        setPhase(1);
      } else {
        setPhase(2);
      }

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
    showErrors || touched.has(field) ? errors[field] : undefined;

  const title = meeting
    ? t('meeting.form.editTitle')
    : t('meeting.form.createTitle');

  const minutes = Number(draft.durationMinutes);
  /*
   * A stored duration that is not one of the planned steps (an older meeting,
   * or a backend value) gets its own row so opening the form never silently
   * rewrites it. Sorting keeps the list ascending.
   */
  const durationOptions = (
    DURATION_STEPS.includes(minutes as (typeof DURATION_STEPS)[number])
      ? [...DURATION_STEPS]
      : [minutes, ...DURATION_STEPS]
  )
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
  const attendeeNames = draft.attendees
    .map((attendee) => attendee.name)
    .slice(0, 3)
    .join(', ');
  const extraAttendees = Math.max(0, draft.attendees.length - 3);

  /*
   * A step is only checked once the reader has moved past it.
   *
   * The date and duration arrive prefilled with sensible values, so validating
   * them on mount would show the Schedule step complete before the reader has
   * looked at it. The stepper marks a visited, valid phase, keeps the current
   * phase current, and leaves the rest upcoming.
   */
  const stepValid = [
    !errors.title,
    !errors.date && !errors.time && !errors.durationMinutes,
    !errors.attendees && !errors.meetLink,
  ];
  const statusFor = (index: number): StepItem['status'] => {
    if (index < phase && stepValid[index]) return 'complete';
    if (index === phase) return 'current';

    return 'upcoming';
  };
  const stepItems: StepItem[] = [
    {
      key: 'session',
      label: t('meeting.form.sections.session'),
      status: statusFor(0),
    },
    {
      key: 'schedule',
      label: t('meeting.form.sections.schedule'),
      status: statusFor(1),
    },
    {
      key: 'people',
      label: t('meeting.form.sections.people'),
      status: statusFor(2),
    },
  ];

  const phaseValid =
    phase === 0
      ? !errors.title
      : phase === 1
        ? !errors.date && !errors.time && !errors.durationMinutes
        : !errors.attendees && !errors.meetLink;

  const next = () => {
    if (!phaseValid) {
      setShowErrors(true);
      return;
    }

    setDateOpen(false);
    setTimeOpen(false);
    setPhase((current) => Math.min(2, current + 1));
  };

  const back = () => {
    setDateOpen(false);
    setTimeOpen(false);
    setPhase((current) => Math.max(0, current - 1));
  };

  return (
    <Animated.View
      layout={LinearTransition.duration(220).reduceMotion(ReduceMotion.System)}
      className="gap-4"
    >
      <DialogHeader className="gap-1 pr-8">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {meeting
            ? t('meeting.form.editDescription')
            : t('meeting.form.createDescription')}
        </DialogDescription>
      </DialogHeader>

      <Steps steps={stepItems} testID="meeting-form-steps" />
      <Separator />

      <ScrollView
        style={{
          maxHeight: Math.min(Math.max(200, height * 0.52), 460),
          flexShrink: 1,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-4 pb-1"
      >
        <Animated.View
          key={phase}
          entering={FadeIn.duration(170).reduceMotion(ReduceMotion.System)}
          className="gap-4"
        >
          {phase === 0 ? (
            <>
              <Field
                label={t('meeting.form.title')}
                hint={t('meeting.form.languageHint')}
                error={errorFor('title') ? t(errorFor('title')!) : null}
              >
                <Input
                  testID="meeting-title-input"
                  value={draft.title}
                  onChangeText={(value) => setField('title', value)}
                  onBlur={() => markTouched('title')}
                  placeholder={t('meeting.form.titlePlaceholder')}
                  accessibilityLabel={t('meeting.form.title')}
                  editable={!pending}
                  invalid={Boolean(errorFor('title'))}
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
                  autoGrow
                  rows={3}
                  maxRows={7}
                />
              </Field>
            </>
          ) : null}

          {phase === 1 ? (
            <>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Field
                    label={t('meeting.form.date')}
                    error={errorFor('date') ? t(errorFor('date')!) : null}
                  >
                    <Pressable
                      testID="meeting-date-trigger"
                      accessibilityRole="button"
                      accessibilityLabel={t('meeting.form.pickDate')}
                      onPress={() => setDateOpen(true)}
                      className={cn(
                        'min-h-14 flex-row items-center gap-2 rounded-lg border bg-background px-3 active:opacity-80',
                        errorFor('date')
                          ? 'border-destructive'
                          : 'border-input',
                      )}
                    >
                      <Icon name="calendar" size={18} tone="muted" />
                      <Text
                        variant="body"
                        className="min-w-0 flex-1"
                        numberOfLines={1}
                      >
                        {formatDayMonth(
                          parseDateKey(draft.date as DateKey),
                          language,
                        )}
                      </Text>
                      <Icon name="chevron-down" size={16} tone="muted" />
                    </Pressable>
                  </Field>
                </View>

                <View className="flex-1">
                  <Field
                    label={t('meeting.form.time')}
                    error={errorFor('time') ? t(errorFor('time')!) : null}
                  >
                    <Pressable
                      testID="meeting-time-trigger"
                      accessibilityRole="button"
                      accessibilityLabel={t('meeting.form.pickTime')}
                      onPress={() => setTimeOpen(true)}
                      className={cn(
                        'min-h-14 flex-row items-center gap-2 rounded-lg border bg-background px-3 active:opacity-80',
                        errorFor('time')
                          ? 'border-destructive'
                          : 'border-input',
                      )}
                    >
                      <Icon name="clock" size={18} tone="muted" />
                      <Text
                        variant="body"
                        className="min-w-0 flex-1"
                        numberOfLines={1}
                      >
                        {formatClockTime(draft.time, language)}
                      </Text>
                      <Icon name="chevron-down" size={16} tone="muted" />
                    </Pressable>
                  </Field>
                </View>
              </View>

              <Field
                label={t('meeting.form.duration')}
                error={
                  errorFor('durationMinutes')
                    ? t(errorFor('durationMinutes')!)
                    : null
                }
              >
                <View className="gap-1">
                  {durationOptions.map((option) => {
                    const selected = Number(draft.durationMinutes) === option;

                    return (
                      <Pressable
                        key={option}
                        testID={`meeting-duration:${option}`}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => {
                          setField('durationMinutes', String(option));
                          markTouched('durationMinutes');
                        }}
                        className={cn(
                          'min-h-12 flex-row items-center justify-between gap-3 rounded-lg border px-3',
                          selected
                            ? 'border-brass/60 bg-secondary'
                            : 'border-input',
                        )}
                      >
                        <Text variant="body">{durationLabel(option, t)}</Text>
                        <View
                          className={cn(
                            'h-5 w-5 items-center justify-center rounded-full border',
                            selected ? 'border-brass' : 'border-input',
                          )}
                        >
                          {selected ? (
                            <View className="h-2.5 w-2.5 rounded-full bg-brass" />
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </Field>
            </>
          ) : null}

          {phase === 2 ? (
            <>
              <Field
                label={t('meeting.form.attendees')}
                hint={
                  attendeeNames
                    ? `${attendeeNames}${extraAttendees > 0 ? ` +${extraAttendees}` : ''}`
                    : t('meeting.form.inviteHint')
                }
                error={errorFor('attendees') ? t(errorFor('attendees')!) : null}
              >
                <Pressable
                  testID="meeting-attendees-trigger"
                  accessibilityRole="button"
                  accessibilityLabel={t('meeting.form.invite')}
                  onPress={() => setAttendeesOpen(true)}
                  className={cn(
                    'min-h-14 flex-row items-center gap-3 rounded-lg border bg-background px-3 active:opacity-80',
                    errorFor('attendees')
                      ? 'border-destructive'
                      : 'border-input',
                  )}
                >
                  <Icon name="users" tone="muted" />
                  <View className="min-w-0 flex-1">
                    <Text variant="label">
                      {draft.attendees.length === 0
                        ? t('meeting.form.noAttendees')
                        : t('meeting.attendees', {
                            count: draft.attendees.length,
                          })}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={18} tone="muted" />
                </Pressable>
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
                  onBlur={() => markTouched('meetLink')}
                  placeholder="https://meet.google.com/…"
                  accessibilityLabel={t('meeting.form.meetLink')}
                  editable={!pending}
                  invalid={Boolean(errorFor('meetLink'))}
                  autoCapitalize="none"
                  inputMode="url"
                  maxLength={2048}
                />
              </Field>
            </>
          ) : null}
        </Animated.View>
      </ScrollView>

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

      <View className="flex-row gap-2">
        {phase > 0 ? (
          <Button
            variant="outline"
            className="flex-1"
            label={t('action.back')}
            onPress={back}
            disabled={pending}
            testID="meeting-form-back"
          />
        ) : null}

        {phase < 2 ? (
          <Button
            className="flex-1"
            label={t('action.continue')}
            onPress={next}
            testID="meeting-form-next"
          />
        ) : (
          <Button
            className="flex-1"
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
        )}
      </View>

      {dateOpen ? (
        <DateSheet
          open
          value={draft.date as DateKey}
          onChange={(date) => {
            setField('date', date);
            markTouched('date');
          }}
          onClose={() => setDateOpen(false)}
        />
      ) : null}

      {timeOpen ? (
        <TimeSheet
          open
          value={draft.time}
          onChange={(time) => {
            setField('time', time);
            markTouched('time');
          }}
          onClose={() => setTimeOpen(false)}
        />
      ) : null}

      {attendeesOpen ? (
        <AttendeeSheet
          open
          selected={draft.attendees}
          onChange={(attendees) => {
            setDraft((current) => ({ ...current, attendees }));
            markTouched('attendees');
          }}
          onClose={() => setAttendeesOpen(false)}
        />
      ) : null}
    </Animated.View>
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
