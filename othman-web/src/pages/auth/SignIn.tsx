import { useTranslation } from 'react-i18next';
import { EmailPasswordAuthToggle } from './components/EmailPasswordAuthToggle';
import { AUTH_PROVIDER_LIST } from '@/firebase/auth/auth-providers';

export const SignInPage = () => {
    const { t } = useTranslation();

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-green-900 px-4">
            <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-md shadow-sm p-8">
                {/* Header */}
                <div className="text-center mb-6 text-neutral-500 dark:text-neutral-200">
                    <h1 className="text-2xl font-semibold">
                        {t('auth.login.title')}
                    </h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        {t('auth.login.subtitle')}
                    </p>
                </div>

                {/* Email/Password Auth */}
                <EmailPasswordAuthToggle />

                {/* Divider */}
                <div className="flex items-center my-6">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="px-3 text-xs text-gray-400">OR</span>
                    <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Social logins */}
                <div className="flex flex-col gap-3">
                    {AUTH_PROVIDER_LIST.map((provider) => (
                        <provider.Component key={provider.id} />
                    ))}
                </div>
            </div>
        </main>
    );
};
