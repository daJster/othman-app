import { Outlet, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import { Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Footer } from '@/components/Footer';

export function MinimalLayout() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <div className="flex min-h-screen flex-col dark:bg-green-900 bg-white dark:text-white text-neutral-800">
            <div className="flex items-center gap-2 p-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(-1)}
                    className='flex items-center w-auto p-2 gap-2 justify-start'
                >
                    <Undo2 className="h-6 w-6" />
                    <span className="text-sm font-medium">{t("label.back")}</span>
                </Button>
            </div>
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
