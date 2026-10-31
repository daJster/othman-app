import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

import { useSidebar } from '@/components/ui/sidebar.tsx';
import LanguageToggle from '@/components/utils/LanguageToggle.tsx';
import ThemeToggle from '@/components/utils/ThemeToggle.tsx';
import SideMenu from '@/components/utils/SideMenu.tsx';
import { MenuIcon } from 'lucide-react';
interface NavbarProps {
    className?: string;
}

export function Navbar({ className }: NavbarProps) {
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(true);
    const { toggleSidebar } = useSidebar();

    const lastScrollY = useRef(0);

    useEffect(() => {
        let ticking = false;

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const currentScrollY = window.scrollY;

                    if (
                        currentScrollY > lastScrollY.current &&
                        currentScrollY > 100
                    ) {
                        setIsVisible(false);
                    } else {
                        setIsVisible(true);
                    }

                    lastScrollY.current = currentScrollY;
                    ticking = false;
                });

                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav
            className={cn(
                'fixed top-0 left-0 right-0 z-50 h-14',
                'transform transition-transform duration-300 ease-in-out will-change-transform',
                isVisible ? 'translate-y-0' : '-translate-y-full',
                'bg-white shadow-2xl dark:bg-green-800',
                className
            )}
        >
            <div className="container h-full mx-auto px-4 max-w-6xl">
                <div className="flex items-center justify-between h-full">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <a href="/" className="flex items-center gap-2">
                            <img
                                src={'/othman-dark.png'}
                                alt={t('app.name')}
                                className="h-8 w-auto scale-0 dark:scale-100"
                            />
                            <img
                                src={'/othman-light.png'}
                                alt={t('app.name')}
                                className="absolute h-8 w-auto scale-100 dark:scale-0"
                            />
                        </a>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <LanguageToggle />
                        <ThemeToggle />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={toggleSidebar}
                                    className={
                                        'flex p-2 gap-2 bg-gray-50 text-neutral-700 dark:text-white dark:bg-green-800 cursor-pointer  items-center'
                                    }
                                >
                                    <MenuIcon className="h-5 w-5" />
                                    <p className={'hidden md:flex'}>Menu</p>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{t('nav.menuTooltip')}</p>
                            </TooltipContent>
                        </Tooltip>

                        {/* Navigation */}
                        <SideMenu title={t('app.name')} />
                    </div>
                </div>
            </div>
        </nav>
    );
}
