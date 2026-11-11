import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import {
  formatDateKey,
  isDateKey,
  parseDateKey,
} from '@/core/domain/meetings/date-key';
import type { SurahMetadata } from '@/core/types';
import {
  api,
  backendMessageKey,
  useApiMutation,
  useApiQuery,
  type BackendBookmark,
  type BackendNote,
} from '@/api';
import { useSessionRole } from '@/features/auth/use-session-role';
import { formatShortDate } from '@/features/meetings/calendar-format';
import {
  formatNumber,
  formatPercent,
} from '@/features/progress/progress-format';
import type { SurahProgress } from '@/core/domain/progress/surah-progress';
import { useDirection } from '@/i18n';
import { Badge } from '@/ui/badge';
import { Button, ButtonText } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import { Page } from '@/ui/page';
import { PageHeader } from '@/ui/page-header';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  SectionRail,
  useToast,
} from '@/ui/panel';
import { Pressable } from '@/ui/pressable';
import { Progress } from '@/ui/progress';
import { Screen, ScreenView } from '@/ui/screen';
import { ErrorState, Loading } from '@/ui/states';
import { Text } from '@/ui/text';
import { Textarea } from '@/ui/textarea';
import {
  absoluteAyahNumber,
  ayahReference,
  surahLabel,
} from './records-format';

/**
 * My Qur'an — the reader's own records.
 *
 * Three sections, one dataset about one reading life: what is memorised, where
 * the reader stopped, and what they wrote down. They share a page and a rail
 * because switching between them is a change of question, not a change of
 * destination — navigating away and back would lose the scroll position and
 * the catalog.
 *
 * Every write goes to the mock server through the backend hooks; the reader's
 * local display preferences (edition, theme, page) stay where they are, in the
 * reader menu, because they are not records.
 *
 * Forms are dialogs, not sheets: each is one or two fields around a reference
 * the page already shows, and stacking a second full-screen surface for a
 * percentage would outweigh the thing it edits.
 */
type RecordsSection = 'progress' | 'bookmarks' | 'notes';

export function QuranRecordsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useSessionRole();
  const [section, setSection] = useState<RecordsSection>('progress');
  const catalog = useApiQuery(api.demo.quran.catalog);
  const surahs = catalog.data?.surahs ?? {};

  if (session.state === 'restoring' || session.state === 'loading') {
    return (
      <ScreenView>
        <Loading label={t('action.loading')} />
      </ScreenView>
    );
  }

  if (session.state === 'signed-out') {
    return (
      <ScreenView>
        <Head>
          <title>{`${t('records.title')} · ${t('app.name')}`}</title>
        </Head>
        <EmptyState
          title={t('records.signedOut.title')}
          description={t('records.signedOut.description')}
          actionLabel={t('action.signIn')}
          onAction={() => router.push('/auth/sign-in')}
        />
      </ScreenView>
    );
  }

  return (
    <ScreenView>
      <Head>
        <title>{`${t('records.title')} · ${t('app.name')}`}</title>
      </Head>

      <PageHeader
        title={t('records.title')}
        onBack={() => router.back()}
        backTestID="records-back"
      />

      <SectionRail
        testID="records-sections"
        value={section}
        onChange={setSection}
        sections={SECTIONS.map((item) => ({
          key: item.key,
          label: t(item.labelKey),
          icon: item.icon,
        }))}
        className="mx-auto w-full max-w-3xl px-4"
      />

      <Screen key={section} contentContainerClassName="gap-0 p-0">
        <Page width="default" className="gap-5 py-4 pb-10">
          {section === 'progress' ? <ProgressSection surahs={surahs} /> : null}
          {section === 'bookmarks' ? (
            <BookmarksSection surahs={surahs} />
          ) : null}
          {section === 'notes' ? <NotesSection surahs={surahs} /> : null}
        </Page>
      </Screen>
    </ScreenView>
  );
}

/* ── memorisation ─────────────────────────────────────────────────── */

function ProgressSection({
  surahs,
}: {
  surahs: Readonly<Record<string, SurahMetadata>>;
}) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const toast = useToast();
  const query = useApiQuery(api.demo.quran.progress);
  const put = useApiMutation(api.demo.quran.putProgress);
  const remove = useApiMutation(api.demo.quran.removeProgress);
  const [editing, setEditing] = useState<SurahProgress | 'new' | null>(null);
  const [confirming, setConfirming] = useState<SurahProgress | null>(null);

  const rows = [...(query.data?.progress ?? [])].sort(
    (a, b) => a.surahNumber - b.surahNumber,
  );

  const save = (input: {
    surahNumber: number;
    percent: number;
    lastReviewed: string | null;
  }) => {
    put.mutate(input, {
      onSuccess: () => {
        setEditing(null);
        toast.show(t('records.progress.saved'), { tone: 'success' });
      },
    });
  };

  const removeRow = () => {
    if (!confirming) return;

    remove.mutate(
      { surahNumber: confirming.surahNumber },
      {
        onSuccess: () => {
          setConfirming(null);
          toast.show(t('records.progress.removed'), { tone: 'success' });
        },
        onError: (error) =>
          toast.show(t(backendMessageKey(error)), { tone: 'error' }),
      },
    );
  };

  return (
    <View className="gap-4">
      <SectionIntro
        description={t('records.progress.description')}
        actionLabel={t('records.progress.add')}
        onAction={() => setEditing('new')}
        showAction={rows.length > 0}
        testID="records-progress-add"
      />

      {query.isPending ? <Loading label={t('action.loading')} /> : null}

      {query.isError ? (
        <ErrorState
          title={t('state.errorTitle')}
          description={t(backendMessageKey(query.error))}
          onRetry={query.refetch}
        />
      ) : null}

      {query.isSuccess && rows.length === 0 ? (
        <EmptyState
          title={t('records.progress.empty.title')}
          description={t('records.progress.empty.description')}
          actionLabel={t('records.progress.add')}
          onAction={() => setEditing('new')}
        />
      ) : null}

      {rows.length > 0 ? (
        <View className="border-t border-border">
          {rows.map((row) => {
            const metadata = surahs[String(row.surahNumber)];
            const name = surahLabel(metadata, row.surahNumber, language);

            return (
              <View
                key={row.surahNumber}
                testID={`progress-row:${row.surahNumber}`}
                className="gap-2 border-b border-border py-3"
              >
                <View className="flex-row items-center justify-between gap-3">
                  <View className="min-w-0 flex-1 flex-row items-center gap-2">
                    <Text variant="label" numberOfLines={1} className="shrink">
                      {name}
                    </Text>
                    <Badge
                      variant="outline"
                      label={formatNumber(row.surahNumber, language)}
                    />
                  </View>

                  <Text variant="label" className="tabular-nums">
                    {formatPercent(row.percent, language)}
                  </Text>
                </View>

                <Progress value={row.percent} />

                <View className="flex-row items-center justify-between gap-2">
                  <Text variant="caption" tone="muted">
                    {row.lastReviewed
                      ? t('pages.account.progress.detail.lastReviewed', {
                          date: formatShortDate(
                            parseDateKey(row.lastReviewed),
                            language,
                          ),
                        })
                      : t('pages.account.progress.detail.neverReviewed')}
                  </Text>

                  <View className="flex-row items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      accessibilityLabel={t('records.progress.edit')}
                      onPress={() => setEditing(row)}
                      testID={`progress-edit:${row.surahNumber}`}
                    >
                      <Icon name="pencil" size={16} tone="muted" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      accessibilityLabel={t('action.delete')}
                      onPress={() => setConfirming(row)}
                      testID={`progress-delete:${row.surahNumber}`}
                    >
                      <Icon name="trash" size={16} tone="destructive" />
                    </Button>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {editing ? (
        <ProgressDialog
          row={editing === 'new' ? null : editing}
          pending={put.isPending}
          error={put.error}
          onClose={() => {
            setEditing(null);
            put.reset();
          }}
          onSave={save}
        />
      ) : null}

      <ConfirmDialog
        open={confirming !== null}
        title={t('records.progress.deleteTitle')}
        message={t('records.progress.deleteMessage')}
        confirmLabel={t('action.delete')}
        pending={remove.isPending}
        onCancel={() => setConfirming(null)}
        onConfirm={removeRow}
      />
    </View>
  );
}

function ProgressDialog({
  row,
  pending,
  error,
  onClose,
  onSave,
}: {
  row: SurahProgress | null;
  pending: boolean;
  error: unknown;
  onClose: () => void;
  onSave: (input: {
    surahNumber: number;
    percent: number;
    lastReviewed: string | null;
  }) => void;
}) {
  const { t } = useTranslation();
  const [surah, setSurah] = useState(row ? String(row.surahNumber) : '');
  const [percent, setPercent] = useState(row ? String(row.percent) : '');
  const [reviewed, setReviewed] = useState(row?.lastReviewed ?? '');
  const [submitted, setSubmitted] = useState(false);

  const surahNumber = Number(surah.trim());
  const percentNumber = Number(percent.trim());
  const reviewedValue = reviewed.trim();
  const surahError =
    !Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114;
  const percentError =
    !Number.isInteger(percentNumber) ||
    percentNumber < 0 ||
    percentNumber > 100;
  const reviewedError = reviewedValue.length > 0 && !isDateKey(reviewedValue);
  const valid = !surahError && !percentError && !reviewedError;

  const submit = () => {
    setSubmitted(true);
    if (!valid || pending) return;

    onSave({
      surahNumber,
      percent: percentNumber,
      lastReviewed: reviewedValue.length > 0 ? reviewedValue : null,
    });
  };

  return (
    <Dialog open onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent testID="progress-dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {row ? t('records.progress.edit') : t('records.progress.add')}
          </DialogTitle>
          <DialogDescription>
            {t('records.progress.description')}
          </DialogDescription>
        </DialogHeader>

        <View className="gap-4">
          <View className="flex-row gap-3">
            <View className="flex-1 gap-2">
              <Text variant="label">{t('records.progress.surah')}</Text>
              <Input
                testID="progress-surah"
                value={surah}
                onChangeText={setSurah}
                placeholder="1"
                accessibilityLabel={t('records.progress.surah')}
                editable={!pending}
                invalid={submitted && surahError}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={3}
              />
              <Text variant="caption" tone="muted">
                {t('records.progress.surahHint')}
              </Text>
            </View>

            <View className="flex-1 gap-2">
              <Text variant="label">{t('records.progress.percent')}</Text>
              <Input
                testID="progress-percent"
                value={percent}
                onChangeText={setPercent}
                placeholder="0"
                accessibilityLabel={t('records.progress.percent')}
                editable={!pending}
                invalid={submitted && percentError}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={3}
              />
              <Text variant="caption" tone="muted">
                {t('records.progress.percentHint')}
              </Text>
            </View>
          </View>

          <View className="gap-2">
            <Text variant="label">{t('records.progress.reviewed')}</Text>
            <Input
              testID="progress-reviewed"
              value={reviewed}
              onChangeText={setReviewed}
              placeholder={formatDateKey(new Date())}
              accessibilityLabel={t('records.progress.reviewed')}
              editable={!pending}
              invalid={submitted && reviewedError}
              autoCapitalize="none"
              maxLength={10}
            />
            <Text variant="caption" tone="muted">
              {t('records.progress.reviewedHint')}
            </Text>
          </View>

          {submitted && !valid ? (
            <Text
              variant="caption"
              tone="destructive"
              accessibilityRole="alert"
            >
              {t('backend.error.invalid')}
            </Text>
          ) : null}

          <DialogError error={error} />
        </View>

        <DialogFooter>
          <Button
            variant="ghost"
            label={t('action.cancel')}
            onPress={onClose}
            disabled={pending}
          />
          <Button
            label={t('action.save')}
            onPress={submit}
            disabled={pending}
            testID="progress-save"
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── bookmarks ────────────────────────────────────────────────────── */

function BookmarksSection({
  surahs,
}: {
  surahs: Readonly<Record<string, SurahMetadata>>;
}) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const router = useRouter();
  const toast = useToast();
  const query = useApiQuery(api.demo.bookmarks.list);
  const create = useApiMutation(api.demo.bookmarks.create);
  const update = useApiMutation(api.demo.bookmarks.update);
  const remove = useApiMutation(api.demo.bookmarks.remove);
  const [editing, setEditing] = useState<BackendBookmark | 'new' | null>(null);
  const [confirming, setConfirming] = useState<BackendBookmark | null>(null);

  const rows = [...(query.data?.bookmarks ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  const open = (bookmark: BackendBookmark) => {
    router.push({
      pathname: '/quran',
      params: {
        surah: String(bookmark.surah),
        ayah: String(bookmark.ayah),
      },
    });
  };

  const removeRow = () => {
    if (!confirming) return;

    remove.mutate(
      { id: confirming.id },
      {
        onSuccess: () => {
          setConfirming(null);
          toast.show(t('records.bookmarks.removed'), { tone: 'success' });
        },
        onError: (error) =>
          toast.show(t(backendMessageKey(error)), { tone: 'error' }),
      },
    );
  };

  return (
    <View className="gap-4">
      <SectionIntro
        description={t('records.bookmarks.description')}
        actionLabel={t('records.bookmarks.add')}
        onAction={() => setEditing('new')}
        showAction={rows.length > 0}
        testID="records-bookmarks-add"
      />

      {query.isPending ? <Loading label={t('action.loading')} /> : null}

      {query.isError ? (
        <ErrorState
          title={t('state.errorTitle')}
          description={t(backendMessageKey(query.error))}
          onRetry={query.refetch}
        />
      ) : null}

      {query.isSuccess && rows.length === 0 ? (
        <EmptyState
          title={t('records.bookmarks.empty.title')}
          description={t('records.bookmarks.empty.description')}
          actionLabel={t('records.bookmarks.add')}
          onAction={() => setEditing('new')}
        />
      ) : null}

      {rows.length > 0 ? (
        <View className="border-t border-border">
          {rows.map((bookmark) => {
            const name = surahLabel(
              surahs[String(bookmark.surah)],
              bookmark.surah,
              language,
            );

            return (
              <View
                key={bookmark.id}
                testID={`bookmark-row:${bookmark.id}`}
                className="flex-row items-center gap-3 border-b border-border py-3"
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('records.bookmarks.show')}
                  onPress={() => open(bookmark)}
                  className="min-w-0 flex-1 gap-1 active:opacity-70"
                >
                  <Text variant="label" numberOfLines={1}>
                    {bookmark.label ??
                      ayahReference(name, bookmark.ayah, language)}
                  </Text>
                  {bookmark.label ? (
                    <Text variant="caption" tone="muted">
                      {ayahReference(name, bookmark.ayah, language)}
                    </Text>
                  ) : null}
                </Pressable>

                <View className="flex-row items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    accessibilityLabel={t('records.bookmarks.show')}
                    onPress={() => open(bookmark)}
                    testID={`bookmark-open:${bookmark.id}`}
                  >
                    <Icon name="book-open" size={16} tone="muted" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    accessibilityLabel={t('records.bookmarks.edit')}
                    onPress={() => setEditing(bookmark)}
                    testID={`bookmark-edit:${bookmark.id}`}
                  >
                    <Icon name="pencil" size={16} tone="muted" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    accessibilityLabel={t('action.delete')}
                    onPress={() => setConfirming(bookmark)}
                    testID={`bookmark-delete:${bookmark.id}`}
                  >
                    <Icon name="trash" size={16} tone="destructive" />
                  </Button>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {editing ? (
        <BookmarkDialog
          bookmark={editing === 'new' ? null : editing}
          surahs={surahs}
          pending={create.isPending || update.isPending}
          error={create.error ?? update.error}
          onClose={() => {
            setEditing(null);
            create.reset();
            update.reset();
          }}
          onCreate={(input) =>
            create.mutate(input, {
              onSuccess: () => {
                setEditing(null);
                toast.show(t('records.bookmarks.saved'), { tone: 'success' });
              },
            })
          }
          onUpdate={(input) =>
            update.mutate(input, {
              onSuccess: () => {
                setEditing(null);
                toast.show(t('records.bookmarks.saved'), { tone: 'success' });
              },
            })
          }
        />
      ) : null}

      <ConfirmDialog
        open={confirming !== null}
        title={t('records.bookmarks.deleteTitle')}
        message={t('records.bookmarks.deleteMessage')}
        confirmLabel={t('action.delete')}
        pending={remove.isPending}
        onCancel={() => setConfirming(null)}
        onConfirm={removeRow}
      />
    </View>
  );
}

function BookmarkDialog({
  bookmark,
  surahs,
  pending,
  error,
  onClose,
  onCreate,
  onUpdate,
}: {
  bookmark: BackendBookmark | null;
  surahs: Readonly<Record<string, SurahMetadata>>;
  pending: boolean;
  error: unknown;
  onClose: () => void;
  onCreate: (input: {
    surah: number;
    ayah: number;
    absoluteNumber: number;
    label: string | null;
  }) => void;
  onUpdate: (input: { id: string; patch: { label: string | null } }) => void;
}) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const [surah, setSurah] = useState(bookmark ? String(bookmark.surah) : '');
  const [ayah, setAyah] = useState(bookmark ? String(bookmark.ayah) : '');
  const [label, setLabel] = useState(bookmark?.label ?? '');
  const [submitted, setSubmitted] = useState(false);

  const absolute = absoluteAyahNumber(
    surahs,
    Number(surah.trim()),
    Number(ayah.trim()),
  );
  const referenceInvalid = bookmark === null && absolute === null;
  const valid = !referenceInvalid;

  const submit = () => {
    setSubmitted(true);
    if (!valid || pending) return;

    const trimmedLabel = label.trim().length > 0 ? label.trim() : null;

    if (bookmark) {
      onUpdate({ id: bookmark.id, patch: { label: trimmedLabel } });
      return;
    }

    if (absolute === null) return;

    onCreate({
      surah: Number(surah.trim()),
      ayah: Number(ayah.trim()),
      absoluteNumber: absolute,
      label: trimmedLabel,
    });
  };

  return (
    <Dialog open onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent testID="bookmark-dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {bookmark
              ? t('records.bookmarks.edit')
              : t('records.bookmarks.add')}
          </DialogTitle>
          <DialogDescription>
            {bookmark
              ? t('records.bookmarks.description')
              : t('records.bookmarks.empty.description')}
          </DialogDescription>
        </DialogHeader>

        <View className="gap-4">
          {bookmark ? (
            <Text variant="caption" tone="muted">
              {ayahReference(
                surahLabel(
                  surahs[String(bookmark.surah)],
                  bookmark.surah,
                  language,
                ),
                bookmark.ayah,
                language,
              )}
            </Text>
          ) : (
            <View className="flex-row gap-3">
              <View className="flex-1 gap-2">
                <Text variant="label">{t('records.bookmarks.surah')}</Text>
                <Input
                  testID="bookmark-surah"
                  value={surah}
                  onChangeText={setSurah}
                  placeholder="1"
                  accessibilityLabel={t('records.bookmarks.surah')}
                  editable={!pending}
                  invalid={submitted && referenceInvalid}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={3}
                />
              </View>
              <View className="flex-1 gap-2">
                <Text variant="label">{t('records.bookmarks.ayah')}</Text>
                <Input
                  testID="bookmark-ayah"
                  value={ayah}
                  onChangeText={setAyah}
                  placeholder="1"
                  accessibilityLabel={t('records.bookmarks.ayah')}
                  editable={!pending}
                  invalid={submitted && referenceInvalid}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={3}
                />
              </View>
            </View>
          )}

          <View className="gap-2">
            <Text variant="label">{t('records.bookmarks.label')}</Text>
            <Input
              testID="bookmark-label"
              value={label}
              onChangeText={setLabel}
              placeholder={t('records.bookmarks.labelPlaceholder')}
              accessibilityLabel={t('records.bookmarks.label')}
              editable={!pending}
              maxLength={200}
            />
          </View>

          {submitted && !valid ? (
            <Text
              variant="caption"
              tone="destructive"
              accessibilityRole="alert"
            >
              {t('backend.error.invalid')}
            </Text>
          ) : null}

          <DialogError error={error} />
        </View>

        <DialogFooter>
          <Button
            variant="ghost"
            label={t('action.cancel')}
            onPress={onClose}
            disabled={pending}
          />
          <Button
            label={t('action.save')}
            onPress={submit}
            disabled={pending}
            testID="bookmark-save"
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── notes ────────────────────────────────────────────────────────── */

function NotesSection({
  surahs,
}: {
  surahs: Readonly<Record<string, SurahMetadata>>;
}) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const router = useRouter();
  const toast = useToast();
  const query = useApiQuery(api.demo.notes.list, {});
  const create = useApiMutation(api.demo.notes.save);
  const update = useApiMutation(api.demo.notes.update);
  const remove = useApiMutation(api.demo.notes.remove);
  const [editing, setEditing] = useState<BackendNote | 'new' | null>(null);
  const [confirming, setConfirming] = useState<BackendNote | null>(null);

  const rows = [...(query.data?.notes ?? [])].sort(
    (a, b) => b.createdAt - a.createdAt,
  );

  const open = (note: BackendNote) => {
    router.push({
      pathname: '/quran',
      params: {
        surah: String(note.ayah.surah),
        ayah: String(note.ayah.ayah),
      },
    });
  };

  const removeRow = () => {
    if (!confirming) return;

    remove.mutate(
      { id: confirming.id },
      {
        onSuccess: () => {
          setConfirming(null);
          toast.show(t('records.notes.removed'), { tone: 'success' });
        },
        onError: (error) =>
          toast.show(t(backendMessageKey(error)), { tone: 'error' }),
      },
    );
  };

  return (
    <View className="gap-4">
      <SectionIntro
        description={t('records.notes.description')}
        actionLabel={t('records.notes.add')}
        onAction={() => setEditing('new')}
        showAction={rows.length > 0}
        testID="records-notes-add"
      />

      {query.isPending ? <Loading label={t('action.loading')} /> : null}

      {query.isError ? (
        <ErrorState
          title={t('state.errorTitle')}
          description={t(backendMessageKey(query.error))}
          onRetry={query.refetch}
        />
      ) : null}

      {query.isSuccess && rows.length === 0 ? (
        <EmptyState
          title={t('records.notes.empty.title')}
          description={t('records.notes.empty.description')}
          actionLabel={t('records.notes.add')}
          onAction={() => setEditing('new')}
        />
      ) : null}

      {rows.length > 0 ? (
        <View className="border-t border-border">
          {rows.map((note) => {
            const name = surahLabel(
              surahs[String(note.ayah.surah)],
              note.ayah.surah,
              language,
            );

            return (
              <View
                key={note.id}
                testID={`note-row:${note.id}`}
                className="gap-2 border-b border-border py-3"
              >
                <View className="flex-row items-center justify-between gap-2">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('records.notes.open')}
                    onPress={() => open(note)}
                    className="min-w-0 flex-1 active:opacity-70"
                  >
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {ayahReference(name, note.ayah.ayah, language)}
                    </Text>
                  </Pressable>

                  <View className="flex-row items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      accessibilityLabel={t('records.notes.open')}
                      onPress={() => open(note)}
                      testID={`note-open:${note.id}`}
                    >
                      <Icon name="book-open" size={16} tone="muted" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      accessibilityLabel={t('records.notes.edit')}
                      onPress={() => setEditing(note)}
                      testID={`note-edit:${note.id}`}
                    >
                      <Icon name="pencil" size={16} tone="muted" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      accessibilityLabel={t('action.delete')}
                      onPress={() => setConfirming(note)}
                      testID={`note-delete:${note.id}`}
                    >
                      <Icon name="trash" size={16} tone="destructive" />
                    </Button>
                  </View>
                </View>

                <Text variant="body" className="leading-relaxed">
                  {note.text}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {editing ? (
        <NoteDialog
          note={editing === 'new' ? null : editing}
          surahs={surahs}
          pending={create.isPending || update.isPending}
          error={create.error ?? update.error}
          onClose={() => {
            setEditing(null);
            create.reset();
            update.reset();
          }}
          onCreate={(input) =>
            create.mutate(input, {
              onSuccess: () => {
                setEditing(null);
                toast.show(t('records.notes.saved'), { tone: 'success' });
              },
            })
          }
          onUpdate={(input) =>
            update.mutate(input, {
              onSuccess: () => {
                setEditing(null);
                toast.show(t('records.notes.saved'), { tone: 'success' });
              },
            })
          }
        />
      ) : null}

      <ConfirmDialog
        open={confirming !== null}
        title={t('records.notes.deleteTitle')}
        message={t('records.notes.deleteMessage')}
        confirmLabel={t('action.delete')}
        pending={remove.isPending}
        onCancel={() => setConfirming(null)}
        onConfirm={removeRow}
      />
    </View>
  );
}

function NoteDialog({
  note,
  surahs,
  pending,
  error,
  onClose,
  onCreate,
  onUpdate,
}: {
  note: BackendNote | null;
  surahs: Readonly<Record<string, SurahMetadata>>;
  pending: boolean;
  error: unknown;
  onClose: () => void;
  onCreate: (input: {
    surah: number;
    ayah: number;
    absoluteNumber: number;
    text: string;
  }) => void;
  onUpdate: (input: { id: string; text: string }) => void;
}) {
  const { t } = useTranslation();
  const [surah, setSurah] = useState(note ? String(note.ayah.surah) : '');
  const [ayah, setAyah] = useState(note ? String(note.ayah.ayah) : '');
  const [text, setText] = useState(note?.text ?? '');
  const [submitted, setSubmitted] = useState(false);

  const absolute =
    note === null
      ? absoluteAyahNumber(surahs, Number(surah.trim()), Number(ayah.trim()))
      : note.ayah.absoluteNumber;
  const referenceInvalid = note === null && absolute === null;
  const textInvalid = text.trim().length === 0;
  const valid = !referenceInvalid && !textInvalid;

  const submit = () => {
    setSubmitted(true);
    if (!valid || pending) return;

    if (note) {
      onUpdate({ id: note.id, text: text.trim() });
      return;
    }

    if (absolute === null) return;

    onCreate({
      surah: Number(surah.trim()),
      ayah: Number(ayah.trim()),
      absoluteNumber: absolute,
      text: text.trim(),
    });
  };

  return (
    <Dialog open onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent testID="note-dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {note ? t('records.notes.edit') : t('records.notes.add')}
          </DialogTitle>
          <DialogDescription>
            {t('records.notes.description')}
          </DialogDescription>
        </DialogHeader>

        <View className="gap-4">
          {note === null ? (
            <View className="flex-row gap-3">
              <View className="flex-1 gap-2">
                <Text variant="label">{t('records.notes.surah')}</Text>
                <Input
                  testID="note-surah"
                  value={surah}
                  onChangeText={setSurah}
                  placeholder="1"
                  accessibilityLabel={t('records.notes.surah')}
                  editable={!pending}
                  invalid={submitted && referenceInvalid}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={3}
                />
              </View>
              <View className="flex-1 gap-2">
                <Text variant="label">{t('records.notes.ayah')}</Text>
                <Input
                  testID="note-ayah"
                  value={ayah}
                  onChangeText={setAyah}
                  placeholder="1"
                  accessibilityLabel={t('records.notes.ayah')}
                  editable={!pending}
                  invalid={submitted && referenceInvalid}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={3}
                />
              </View>
            </View>
          ) : null}

          <View className="gap-2">
            <Text variant="label">{t('records.notes.text')}</Text>
            <Textarea
              testID="note-text"
              value={text}
              onChangeText={setText}
              placeholder={t('records.notes.textPlaceholder')}
              accessibilityLabel={t('records.notes.text')}
              editable={!pending}
              maxLength={5000}
            />
          </View>

          {submitted && !valid ? (
            <Text
              variant="caption"
              tone="destructive"
              accessibilityRole="alert"
            >
              {t('records.notes.validation')}
            </Text>
          ) : null}

          <DialogError error={error} />
        </View>

        <DialogFooter>
          <Button
            variant="ghost"
            label={t('action.cancel')}
            onPress={onClose}
            disabled={pending}
          />
          <Button
            label={t('action.save')}
            onPress={submit}
            disabled={pending}
            testID="note-save"
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── shared chrome ────────────────────────────────────────────────── */

function SectionIntro({
  description,
  actionLabel,
  onAction,
  showAction = true,
  testID,
}: {
  description: string;
  actionLabel: string;
  onAction: () => void;
  /** Hidden while the empty state owns the one call to action. */
  showAction?: boolean;
  testID: string;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text variant="caption" tone="muted" className="min-w-0 flex-1">
        {description}
      </Text>
      {showAction ? (
        <Button size="sm" onPress={onAction} testID={testID}>
          <Icon name="plus" size={16} tone="primary-foreground" />
          <ButtonText size="sm">{actionLabel}</ButtonText>
        </Button>
      ) : null}
    </View>
  );
}

function DialogError({ error }: { error: unknown }) {
  const { t } = useTranslation();

  if (!error) return null;

  return (
    <Text
      variant="caption"
      tone="destructive"
      accessibilityRole="alert"
      testID="record-dialog-error"
    >
      {t(backendMessageKey(error))}
    </Text>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && !pending && onCancel()}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            label={t('action.cancel')}
            onPress={onCancel}
            disabled={pending}
          />
          <Button
            variant="destructive"
            label={confirmLabel}
            onPress={onConfirm}
            disabled={pending}
            testID="record-confirm-delete"
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const SECTIONS = [
  {
    key: 'progress',
    labelKey: 'records.sections.progress',
    icon: 'target',
  },
  {
    key: 'bookmarks',
    labelKey: 'records.sections.bookmarks',
    icon: 'bookmark',
  },
  {
    key: 'notes',
    labelKey: 'records.sections.notes',
    icon: 'pencil',
  },
] as const satisfies readonly {
  key: RecordsSection;
  labelKey: string;
  icon: 'target' | 'bookmark' | 'pencil';
}[];
