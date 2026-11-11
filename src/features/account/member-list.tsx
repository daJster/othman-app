import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { UserRole } from '@/core/types';
import { api, backendMessageKey, useApiQuery } from '@/api';
import { useSessionRole } from '@/features/auth/use-session-role';
import type { BackendUser } from '@/api';
import { Avatar } from '@/ui/avatar';
import { Badge } from '@/ui/badge';
import { Button, ButtonText } from '@/ui/button';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { Icon } from '@/ui/icon';
import { Page } from '@/ui/page';
import { PageHeader } from '@/ui/page-header';
import { SearchBar } from '@/ui/panel';
import { Pressable } from '@/ui/pressable';
import { Screen, ScreenView } from '@/ui/screen';
import { EmptyState, ErrorState, Loading } from '@/ui/states';
import { Text } from '@/ui/text';
import { ASSIGNABLE_MEMBER_ROLES, memberName } from './member-form';
import { roleLabelKey } from './role-label';

/**
 * The cohort's account list.
 *
 * A member list is a lookup before it is a table: the search field is the first
 * control, the role filters are the second, and the rows are hairlines rather
 * than a grid so the email can wrap on a phone without breaking columns. Every
 * row opens the edit sheet — there is no separate "details" page, because an
 * administrator's next action is almost always a change.
 *
 * The list is scoped to what the server returned. A local filter over a partial
 * page would silently hide members 101+, so the search and role parameters go
 * to the server.
 */
type RoleFilter = 'all' | (typeof ASSIGNABLE_MEMBER_ROLES)[number];

export function MemberListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useSessionRole();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('all');
  const deferredSearch = useDeferredValue(search.trim());

  const params = useMemo(
    () => ({
      ...(deferredSearch ? { q: deferredSearch } : {}),
      ...(role === 'all' ? {} : { role: role as UserRole }),
      limit: 100,
    }),
    [deferredSearch, role],
  );

  const query = useApiQuery(api.demo.accounts.list, params);
  const accounts = query.data?.accounts ?? [];
  const hasFilters = deferredSearch.length > 0 || role !== 'all';

  return (
    <ScreenView>
      <Head>
        <title>{`${t('members.title')} · ${t('app.name')}`}</title>
      </Head>

      <PageHeader
        title={t('members.title')}
        onBack={() => router.back()}
        backTestID="members-back"
        end={
          <Button
            size="sm"
            onPress={() => router.push('/admin/members/edit')}
            testID="member-create"
          >
            <Icon name="plus" size={16} tone="primary-foreground" />
            <ButtonText size="sm">{t('members.add')}</ButtonText>
          </Button>
        }
      />

      <Screen contentContainerClassName="gap-0 p-0">
        <Page width="default" className="gap-4 py-4 pb-10">
          <Text variant="caption" tone="muted">
            {t('members.subtitle')}
          </Text>

          <View className="gap-3">
            <SearchBar
              testID="members-search"
              inputTestID="members-search-input"
              value={search}
              onChangeText={setSearch}
              placeholder={t('members.search.placeholder')}
              accessibilityLabel={t('members.search.placeholder')}
              clearAccessibilityLabel={t('members.search.clear')}
            />

            <View
              className="flex-row flex-wrap gap-2"
              accessibilityRole="radiogroup"
              accessibilityLabel={t('members.filters')}
            >
              {FILTERS.map((option) => {
                const selected = option === role;

                return (
                  <Button
                    key={option}
                    testID={`members-filter:${option}`}
                    size="sm"
                    variant={selected ? 'secondary' : 'ghost'}
                    accessibilityState={{ selected }}
                    label={
                      option === 'all'
                        ? t('pages.account.progress.filters.all')
                        : t(roleLabelKey(option))
                    }
                    onPress={() => setRole(option)}
                    className="border border-border"
                  />
                );
              })}
            </View>
          </View>

          {query.isPending ? <Loading label={t('action.loading')} /> : null}

          {query.isError ? (
            <ErrorState
              title={t('state.errorTitle')}
              description={t(backendMessageKey(query.error))}
              onRetry={query.refetch}
            />
          ) : null}

          {query.isSuccess && accounts.length === 0 ? (
            <EmptyState
              testID="members-empty"
              title={
                hasFilters
                  ? t('members.filteredEmpty.title')
                  : t('members.empty.title')
              }
              description={
                hasFilters
                  ? t('members.filteredEmpty.description')
                  : t('members.empty.description')
              }
              actionLabel={
                hasFilters
                  ? t('members.filteredEmpty.clear')
                  : t('members.empty.action')
              }
              onAction={() => {
                if (hasFilters) {
                  setSearch('');
                  setRole('all');
                  return;
                }
                router.push('/admin/members/edit');
              }}
            />
          ) : null}

          {query.isSuccess && accounts.length > 0 ? (
            <View className="border-t border-border">
              {accounts.map((account) => (
                <MemberRow
                  key={account.uid}
                  account={account}
                  isSelf={account.uid === session.uid}
                  onPress={() =>
                    router.push({
                      pathname: '/admin/members/edit',
                      params: { uid: account.uid },
                    })
                  }
                />
              ))}
            </View>
          ) : null}
        </Page>
      </Screen>
    </ScreenView>
  );
}

function MemberRow({
  account,
  isSelf,
  onPress,
}: {
  account: BackendUser;
  isSelf: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const name = memberName(account);

  return (
    <Pressable
      testID={`member-row:${account.uid}`}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${account.email}, ${t(roleLabelKey(account.role))}`}
      onPress={onPress}
      className={cn(
        'min-h-16 flex-row items-center gap-3 border-b border-border py-3 active:opacity-70',
        FOCUS_RING,
      )}
    >
      <Avatar size="lg" src={account.photoURL} name={name} />

      <View className="min-w-0 flex-1 gap-1">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text variant="label" numberOfLines={1} className="shrink">
            {name}
          </Text>
          {isSelf ? <Badge variant="outline" label={t('members.you')} /> : null}
          {account.disabled ? (
            <Badge variant="neutral" label={t('members.disabled')} />
          ) : null}
        </View>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {account.email}
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        <Text variant="caption" tone="muted">
          {t(roleLabelKey(account.role))}
        </Text>
        <Icon name="chevron-right" size={16} tone="muted" />
      </View>
    </Pressable>
  );
}

const FILTERS: readonly RoleFilter[] = ['all', ...ASSIGNABLE_MEMBER_ROLES];
