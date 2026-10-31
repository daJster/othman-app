import { useTranslation } from 'react-i18next';
import { DeferredButton } from '@/components/ui/deferred-button';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '@/firebase';
import { fullNavigate } from '@/lib/utils';

export const GoogleAuthToggle = () => {
    const { t } = useTranslation();

    const handleGoogleLogin = async () => {
        await signInWithPopup(auth, googleAuthProvider);
    };

    return (
        <DeferredButton
            variant="outline"
            asyncFn={handleGoogleLogin}
            onResolve={() => {
                fullNavigate('/')
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl h-11"
        >
            <p>{t('action.auth.google')}</p>
            <img src="/google.svg" alt="" className={'h-6 w-6'} />
        </DeferredButton>
    );
};
