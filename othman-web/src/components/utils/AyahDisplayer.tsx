'use client';

import { useTheme } from '@/hooks/use-theme';
import type { AyahContent } from '@/providers/QuranReaderProvider';

interface AyahDisplayerProps {
    ayahContent: AyahContent;
    className?: string;
}

export function AyahDisplayer({ ayahContent, className }: AyahDisplayerProps) {
    const { theme } = useTheme();
    const iconSrc =
        theme === 'dark' ? '/ayah_icon-light.svg' : '/ayah_icon-dark.svg';
    return (
        <div className="relative w-full">
            <div
                className={`flex flex-col gap-2 w-full text-center font-kitab text-xl tracking-wide cursor-pointer rounded-md px-2 py-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${className ?? ''}`}
            >
                <span className="dark:text-white text-black leading-[2.1]" dir="rtl">
                    <img
                        src={iconSrc}
                        alt=""
                        className="h-8 w-auto inline align-middle mx-2"
                        aria-hidden="true"
                    />

                    {ayahContent.text}

                    <img
                        src={iconSrc}
                        alt=""
                        className="h-8 w-auto inline align-middle mx-2"
                        aria-hidden="true"
                    />
                </span>
            </div>
        </div>
    );
}
