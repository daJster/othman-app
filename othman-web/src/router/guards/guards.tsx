import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button.tsx';
import { ArrowLeftCircle } from 'lucide-react';
import { fullNavigate } from '@/lib/utils';

const errorMessages: Record<string, { title: string; description: string }> = {
    '400': {
        title: 'error.badRequest.title',
        description: 'error.badRequest.description',
    },
    '401': {
        title: 'error.unauthorized.title',
        description: 'error.unauthorized.description',
    },
    '403': {
        title: 'error.forbidden.title',
        description: 'error.forbidden.description',
    },
    '404': {
        title: 'error.pageNotFound.title',
        description: 'error.pageNotFound.description',
    },
    '500': {
        title: 'error.serverError.title',
        description: 'error.serverError.description',
    },
};

export const ErrorGuardPage = () => {
    const { t } = useTranslation();
    const { code } = useParams<{ code: string }>();

    const safeCode = code || '500';

    const error = errorMessages[safeCode] || {
        title: 'Unexpected Error',
        description: 'An unexpected error occurred.',
    };

    return (
        <div className="flex w-full min-h-screen items-center justify-center bg-gray-50 px-6">
            <div className="flex flex-col justify-center text-center max-w-md">
                <h1 className="text-6xl font-bold text-gray-900">{safeCode}</h1>
                <h2 className="mt-4 text-2xl font-semibold text-gray-800">
                    {t(error.title)}
                </h2>
                <p className="mt-2 text-gray-600">{t(error.description)}</p>

                <Button
                    onClick={() => fullNavigate('/')}
                    className="flex gap-2 items-center mt-6 px-5 py-5 rounded-2xl bg-black text-white text-sm hover:bg-gray-800 transition"
                >
                    <ArrowLeftCircle />
                    <p>{t('action.goBackHome')}</p>
                </Button>
            </div>
        </div>
    );
};
