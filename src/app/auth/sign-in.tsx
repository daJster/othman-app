import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import Head from 'expo-router/head';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import type { AuthErrorCode } from '@/core/types';
import { sanitizeReturnTo } from '@/features/auth/return-to';
import { GOOGLE_MARK } from '@/features/brand/assets';
import { BrandMark } from '@/features/brand/brand-mark';
import { useAuth } from '@/providers/auth-provider';
import { Button, ButtonText } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
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
 * The page is a single measured column, not a full-width form: 28rem on every
 * viewport, with the wordmark and a close control in the same column. The
 * brand is the one canopy/brass note an otherwise plain auth surface needs —
 * this is the screen where a visitor decides to hand over a password, so it
 * must look like Othman before it asks for anything.
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
  const [revealPassword, setRevealPassword] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

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

  // Step two starts at the password, not at the Google button again. On a phone
  // the keyboard is already open; on the web this is the difference between
  // typing and hunting for the field.
  useEffect(() => {
    if (step === 'password') passwordRef.current?.focus();
  }, [step]);

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

  const errorNotice = errorCode ? (
    <View
      className="gap-2 rounded-md bg-destructive/10 p-3"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
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
  ) : null;

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
          contentContainerClassName="grow justify-center px-6 py-10"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mx-auto w-full max-w-md gap-8">
            <View className="flex-row items-center justify-between gap-4">
              <BrandMark className="h-9 w-16" />
              <Button
                variant="ghost"
                size="icon"
                accessibilityLabel={t('action.cancel')}
                onPress={close}
                disabled={busy}
                testID="auth-cancel"
              >
                <Icon name="close" size={20} tone="muted" />
              </Button>
            </View>

            <View className="gap-2">
              <Text accessibilityRole="header" variant="title">
                {t('auth.signIn.title')}
              </Text>
              <Text tone="muted">{t('auth.signIn.subtitle')}</Text>
            </View>

            <View className="gap-5">
              <Button
                size="lg"
                variant="outline"
                className="gap-2"
                accessibilityLabel={t('auth.signIn.google')}
                onPress={() => void handleGoogle()}
                disabled={busy}
                testID="auth-google"
              >
                <Image
                  source={GOOGLE_MARK}
                  className="h-5 w-5"
                  contentFit="contain"
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
                <ButtonText size="lg" variant="outline">
                  {pending ? t('action.loading') : t('auth.signIn.google')}
                </ButtonText>
              </Button>

              {step === 'email' ? errorNotice : null}

              <View className="flex-row items-center gap-3">
                <View className="h-px flex-1 bg-border" />
                <Text variant="caption" tone="muted">
                  {t('auth.signIn.or')}
                </Text>
                <View className="h-px flex-1 bg-border" />
              </View>

              {step === 'email' ? (
                <View className="gap-3">
                  <View className="flex-row items-baseline justify-between gap-2">
                    <Text variant="subtitle">
                      {t('auth.signIn.emailTitle')}
                    </Text>
                    <Text variant="caption" tone="muted">
                      1 / 2
                    </Text>
                  </View>
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
                    autoFocus={Platform.OS === 'web'}
                    keyboardType="email-address"
                    returnKeyType="next"
                    textContentType="emailAddress"
                    editable={!busy}
                    invalid={fieldError !== null}
                    accessibilityLabel={t('label.email')}
                    onSubmitEditing={continueWithEmail}
                    className="bg-secondary"
                  />
                  {fieldError ? (
                    <Text
                      variant="caption"
                      tone="destructive"
                      accessibilityRole="alert"
                      accessibilityLiveRegion="polite"
                    >
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
                  <View className="flex-row items-baseline justify-between gap-2">
                    <Text variant="subtitle">
                      {t('auth.signIn.passwordTitle')}
                    </Text>
                    <Text variant="caption" tone="muted">
                      2 / 2
                    </Text>
                  </View>
                  <Text variant="caption" tone="muted">
                    {t('auth.signIn.passwordHint', { email })}
                  </Text>
                  <Text variant="label">{t('label.password')}</Text>
                  <View className="flex-row items-center gap-2">
                    <Input
                      ref={passwordRef}
                      testID="auth-password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!revealPassword}
                      autoCapitalize="none"
                      autoComplete="current-password"
                      textContentType="password"
                      editable={!busy}
                      invalid={fieldError !== null}
                      accessibilityLabel={t('label.password')}
                      onSubmitEditing={() => void handleEmailSignIn()}
                      className="flex-1 bg-secondary"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      accessibilityLabel={
                        revealPassword
                          ? t('label.hidePassword')
                          : t('label.showPassword')
                      }
                      onPress={() => setRevealPassword((value) => !value)}
                      disabled={busy}
                      testID="auth-reveal-password"
                    >
                      <Icon
                        name={revealPassword ? 'eye-off' : 'eye'}
                        size={20}
                        tone="muted"
                      />
                    </Button>
                  </View>
                  {fieldError ? (
                    <Text
                      variant="caption"
                      tone="destructive"
                      accessibilityRole="alert"
                      accessibilityLiveRegion="polite"
                    >
                      {fieldError}
                    </Text>
                  ) : null}
                  {errorNotice}
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
                      setRevealPassword(false);
                      setErrorCode(null);
                      setFieldError(null);
                    }}
                    disabled={busy}
                    testID="auth-back-to-email"
                  />
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenView>
  );
}
