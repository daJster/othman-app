import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { DeferredButton } from '@/components/ui/deferred-button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import {
    Notification,
    NotificationHeader,
    NotificationTitle,
    NotificationDescription,
} from '@/components/ui/notification';
import { checkAccountExists } from '@/firebase/db/fetchAccount';
import { login } from '@/firebase/auth/auth';
import { CornerUpLeft } from 'lucide-react';
import { fullNavigate } from '@/lib/utils';

export const EmailPasswordAuthToggle = () => {
    const { t } = useTranslation();
    const [step, setStep] = useState<'email' | 'password'>('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [showNoAccountNotification, setShowNoAccountNotification] =
        useState(false);

    const handleCheckEmail = async (): Promise<void> => {
        if (!email.trim()) return;

        setError(null);

        try {
            const exists = await checkAccountExists(email.trim());
            if (exists) {
                setStep('password');
            } else {
                setShowNoAccountNotification(true);
            }
        } catch {
            setError('Failed to verify account. Please try again.');
        }
    };

    const handleLogin = async (): Promise<void> => {
        if (!password.trim()) return;

        setError(null);

        try {
            await login(email.trim(), password);
        } catch {
            setError('Invalid email or password.');
        }
    };

    const handleBackToEmail = () => {
        setStep('email');
        setPassword('');
        setError(null);
    };

    return (
        <div className="flex flex-col gap-4">
            {showNoAccountNotification && (
                <Notification variant="warning">
                    <NotificationHeader variant="warning">
                        <NotificationTitle>
                            {t('auth.login.noAccount')}
                        </NotificationTitle>
                    </NotificationHeader>
                    <NotificationDescription>
                        {t('auth.login.createAccountPrompt')}
                    </NotificationDescription>
                </Notification>
            )}

            {error && (
                <Notification variant="destructive">
                    <NotificationHeader variant="destructive">
                        <NotificationTitle>
                            {t('auth.login.error')}
                        </NotificationTitle>
                    </NotificationHeader>
                    <NotificationDescription>{error}</NotificationDescription>
                </Notification>
            )}

            {step === 'email' ? (
                <>
                    <Field>
                        <FieldLabel htmlFor="email">
                            {t('label.email')}
                        </FieldLabel>
                        <Input
                            id="email"
                            type="email"
                            placeholder="email@example.com"
                            dir="auto"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === 'Enter' && handleCheckEmail()
                            }
                        />
                    </Field>
                    <DeferredButton
                        asyncFn={handleCheckEmail}
                        disabled={!email.trim()}
                        className="w-full rounded-xl h-11"
                    >
                        {t('action.auth.continue')}
                    </DeferredButton>
                </>
            ) : (
                <>
                    <Field>
                        <FieldLabel htmlFor="password">
                            {t('label.password')}
                        </FieldLabel>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            dir="auto"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === 'Enter' && handleLogin()
                            }
                        />
                    </Field>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBackToEmail}
                            className='flex flex-row items-center'
                        >
                            <CornerUpLeft />
                            <span>{t('action.back')}</span>
                        </Button>
                        <DeferredButton
                            asyncFn={handleLogin}
                            onResolve={() => {
                                fullNavigate('/')
                            }}
                            disabled={!password.trim()}
                            className="flex-1 rounded-xl h-11"
                        >
                            {t('action.auth.login')}
                        </DeferredButton>
                    </div>
                </>
            )}
        </div>
    );
};
