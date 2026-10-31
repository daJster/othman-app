import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import Head from 'expo-router/head';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import type { AuthErrorCode } from '@/core/types';
import { sanitizeReturnTo } from '@/features/auth/return-to';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { ScreenView } from '@/ui/screen';
import { Loading } from '@/ui/states';
import { Text } from '@/ui/text';

/**
 * Sign-in screen — a modal with two credential paths.
 *
 * Order is deliberate: Google first (one tap), then email followed by
 * password. The email and password are separate steps so the form can stay
 * short and the password field never appears until an address is confirmed.
 *
 * Non-enumeration is a rule, not an accident: every "wrong credentials" variant
 * renders the same text, and the screen never calls a profile/email lookup to
 * ask whether an account exists. `account-exists-with-different-credential` is
 * the one exception, and it is not an enumeration because the provider itself
 * returned that fact to the user who just authenticated.
 *
 * `returnTo` is validated by `sanitizeReturnTo`; an external or malformed value
 * falls back to Home instead of being navigated to.
 */

const ERROR_KEYS = {
  'invalid-credential': 'auth.error.invalid-credential',
  'email-already-in-use': 'auth.error.email-already-in-use',
  'weak-password': 'auth.error.weak-password',
  'user-disabled': 'auth.error.user-disabled',
  network: 'auth.error.network',
  cancelled: 'auth.error.cancelled',
  'operation-not-allowed': 'auth.error.operation-not-allowed',
  'too-many-requests': 'auth.error.too-many-requests',
  'account-exists-with-different-credential':
    'auth.error.account-exists-with-different-credential',
  configuration: 'auth.error.configuration',
  'not-implemented': 'auth.error.not-implemented',
  unknown: 'auth.error.unknown',
} as const satisfies Record<AuthErrorCode, string>;

type ErrorKey = (typeof ERROR_KEYS)[AuthErrorCode];

function errorKey(code: AuthErrorCode): ErrorKey {
  return ERROR_KEYS[code];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { user, status, signInWithEmail, signInWithGoogle } = useAuth();

  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  // One navigation per mount: the signed-in effect and a successful submit can
  // fire for the same transition, and a second `replace` would duplicate the
  // destination in the history.
  const navigated = useRef(false);

  const destination = sanitizeReturnTo(returnTo);

  const goToDestination = useCallback(() => {
    if (navigated.current) return;
    navigated.current = true;
    router.replace(destination as Href);
  }, [destination, router]);

  const close = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router]);

  useEffect(() => {
    if (user) goToDestination();
  }, [goToDestination, user]);

  const continueWithEmail = useCallback(() => {
    setErrorCode(null);
    const value = email.trim();

    if (!EMAIL_PATTERN.test(value)) {
      setFieldError(t('auth.signIn.emailInvalid'));
      return;
    }

    setFieldError(null);
    setEmail(value);
    setStep('password');
  }, [email, t]);

  const handleEmailSignIn = useCallback(async () => {
    if (pending) return;
    setErrorCode(null);
    setFieldError(null);

    if (!password) {
      setFieldError(t('auth.signIn.passwordRequired'));
      return;
    }

    setPending(true);
    const result = await signInWithEmail(email.trim(), password);
    setPending(false);

    if (result.status === 'success') {
      goToDestination();
      return;
    }

    if (result.code === 'cancelled') return;
    setErrorCode(result.code);
  }, [email, goToDestination, password, pending, signInWithEmail, t]);

  const handleGoogle = useCallback(async () => {
    if (pending) return;
    setErrorCode(null);
    setFieldError(null);
    setPending(true);
    const result = await signInWithGoogle();
    setPending(false);

    if (result.status === 'success') {
      goToDestination();
      return;
    }

    if (result.code === 'cancelled') return;
    setErrorCode(result.code);
  }, [goToDestination, pending, signInWithGoogle]);

  const retry = useCallback(() => {
    setErrorCode(null);
    if (step === 'password') {
      void handleEmailSignIn();
      return;
    }
    void handleGoogle();
  }, [handleEmailSignIn, handleGoogle, step]);

  if (status === 'restoring') {
    return (
      <ScreenView>
        <Loading label={t('action.loading')} />
      </ScreenView>
    );
  }

  const busy = pending;
  const accountExists =
    errorCode === 'account-exists-with-different-credential';

  return (
    <ScreenView>
      <Head>
        <title>{`${t('auth.signIn.title')} · ${t('app.name')}`}</title>
      </Head>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="grow justify-center gap-6 p-6"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-2">
            <Text variant="title">{t('auth.signIn.title')}</Text>
            <Text tone="muted">{t('auth.signIn.subtitle')}</Text>
          </View>

          <Button
            size="lg"
            variant="outline"
            label={t('auth.signIn.google')}
            onPress={() => void handleGoogle()}
            disabled={busy}
            testID="auth-google"
          />

          <View className="flex-row items-center gap-3">
            <View className="h-px flex-1 bg-border" />
            <Text variant="caption" tone="muted">
              {t('auth.signIn.or')}
            </Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          {step === 'email' ? (
            <View className="gap-3">
              <Text variant="subtitle">{t('auth.signIn.emailTitle')}</Text>
              <Text variant="caption" tone="muted">
                {t('auth.signIn.emailHint')}
              </Text>
              <Text variant="label">{t('label.email')}</Text>
              <Input
                testID="auth-email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!busy}
                invalid={fieldError !== null}
                accessibilityLabel={t('label.email')}
              />
              {fieldError ? (
                <Text variant="caption" tone="destructive">
                  {fieldError}
                </Text>
              ) : null}
              <Button
                label={t('action.continue')}
                onPress={continueWithEmail}
                disabled={busy}
                testID="auth-continue"
              />
            </View>
          ) : (
            <View className="gap-3">
              <Text variant="subtitle">{t('auth.signIn.passwordTitle')}</Text>
              <Text variant="caption" tone="muted">
                {t('auth.signIn.passwordHint', { email })}
              </Text>
              <Text variant="label">{t('label.password')}</Text>
              <Input
                testID="auth-password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                editable={!busy}
                invalid={fieldError !== null}
                accessibilityLabel={t('label.password')}
                onSubmitEditing={() => void handleEmailSignIn()}
              />
              {fieldError ? (
                <Text variant="caption" tone="destructive">
                  {fieldError}
                </Text>
              ) : null}
              <Button
                label={pending ? t('action.loading') : t('action.signIn')}
                onPress={() => void handleEmailSignIn()}
                disabled={busy}
                testID="auth-submit"
              />
              <Button
                variant="ghost"
                label={t('auth.signIn.back')}
                onPress={() => {
                  setStep('email');
                  setPassword('');
                  setErrorCode(null);
                  setFieldError(null);
                }}
                disabled={busy}
                testID="auth-back-to-email"
              />
            </View>
          )}

          {errorCode ? (
            <View
              className="gap-2 rounded-lg border border-destructive p-3"
              accessibilityRole="alert"
              testID="auth-error"
            >
              <Text variant="label" tone="destructive">
                {accountExists
                  ? t('auth.signIn.accountExistsTitle')
                  : t(errorKey(errorCode))}
              </Text>
              {accountExists ? (
                <Text variant="caption" tone="muted">
                  {t('auth.signIn.accountExistsDescription')}
                </Text>
              ) : null}
              {!accountExists ? (
                <Button
                  variant="outline"
                  size="sm"
                  label={t('auth.signIn.tryAgain')}
                  onPress={retry}
                  disabled={busy}
                  testID="auth-retry"
                />
              ) : null}
            </View>
          ) : null}

          <Button
            variant="ghost"
            label={t('action.cancel')}
            onPress={close}
            disabled={busy}
            testID="auth-cancel"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenView>
  );
}
