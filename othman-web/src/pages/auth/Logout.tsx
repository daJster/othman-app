import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { logout } from '@/firebase/auth/auth';
import { useTranslation } from 'react-i18next';
import { Spinner } from '@/components/ui/spinner';
import { fullNavigate } from '@/lib/utils';

export const LogoutPage = () => {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(true);
    const [countdown, setCountdown] = useState(3);

    useEffect(() => {
        const performLogout = async () => {
            try {
                await logout();
            } catch (error) {
                console.error('Logout error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        performLogout();
    }, []);

    useEffect(() => {
        if (!isLoading && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (!isLoading && countdown === 0) {
            fullNavigate('/')
        }
    }, [isLoading, countdown]);

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-green-900 px-4">
            <div className="w-full max-w-md bg-transparent dark:bg-neutral-800 dark:shadow-2xl dark:rounded-md p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                    {isLoading ? (
                        <>
                            <Spinner />
                            <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200">
                                {t('auth.logout.loading')}
                            </h1>
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="h-16 w-16 text-green-500" />
                            <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200">
                                {t('auth.logout.success')}
                            </h1>
                            <p className="text-neutral-500 dark:text-neutral-400">
                                {t('auth.logout.redirect', { countdown })}
                            </p>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
};
