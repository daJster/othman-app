import { useTranslation } from 'react-i18next';
import { DeferredButton } from '@/components/ui/deferred-button';
import { signInWithPopup } from 'firebase/auth';
import { auth, facebookAuthProvider } from '@/firebase';
import { fullNavigate } from '@/lib/utils';

export const FacebookAuthToggle = () => {
    const { t } = useTranslation();

    const handleFacebookLogin = async () => {
        await signInWithPopup(auth, facebookAuthProvider);
    };

    return (
        <DeferredButton
            variant="outline"
            asyncFn={handleFacebookLogin}
            onResolve={() => {
                fullNavigate('/')
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl h-11"
        >
            <p>{t('action.auth.facebook')}</p>
            <img src="/facebook.svg" alt="" className={'h-6 w-6'} />
        </DeferredButton>
    );
};
