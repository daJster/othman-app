import { useLocalSearchParams, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/button';
import { ScreenView } from '@/ui/screen';
import { ErrorState } from '@/ui/states';

/**
 * Generic error page.
 *
 * Deep-linked rather than navigated to on purpose: a failed request that the
 * app cannot render inline (an auth callback with a bad code, a share link to a
 * forbidden resource) redirects here, so the error survives a reload and is
 * shareable. Inline failures use `<ErrorState>` on the screen itself, which
 * keeps the user's context.
 *
 * The status is the route parameter, not a prop, so `/error/403` is the whole
 * contract. Unknown codes fall back to 404 rather than inventing a message:
 * `/error/418` is a URL that does not describe a state this app knows.
 */
const ERROR_CODES = [400, 401, 403, 404, 500] as const;

type ErrorCode = (typeof ERROR_CODES)[number];

const ERROR_KEYS = {
  400: { title: 'error.400.title', description: 'error.400.description' },
  401: { title: 'error.401.title', description: 'error.401.description' },
  403: { title: 'error.403.title', description: 'error.403.description' },
  404: { title: 'error.404.title', description: 'error.404.description' },
  500: { title: 'error.500.title', description: 'error.500.description' },
} as const satisfies Record<ErrorCode, { title: string; description: string }>;

function isErrorCode(value: number): value is ErrorCode {
  return (ERROR_CODES as readonly number[]).includes(value);
}

export default function ErrorScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();

  const parsed = Number(code);
  const resolved: ErrorCode = isErrorCode(parsed) ? parsed : 404;
  const keys = ERROR_KEYS[resolved];

  return (
    <ScreenView className="items-center justify-center gap-4 p-6">
      <Head>
        <title>{`${t(keys.title)} · ${t('app.name')}`}</title>
      </Head>
      <ErrorState
        className="flex-none p-0"
        title={t(keys.title)}
        description={t(keys.description)}
      />
      <Button
        label={t('action.goBackHome')}
        onPress={() => router.replace('/')}
      />
    </ScreenView>
  );
}
