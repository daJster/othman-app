import React from 'react';
import {
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useQuranReader } from '@/hooks/use-quran-reader';
import { type SurahMetadata } from '@/providers/contexts/quran-reader-context';

interface SurahToggleProps {
    surah: SurahMetadata;
    surahKey: string;
}

const SurahToggle: React.FC<SurahToggleProps> = ({ surah, surahKey }) => {
    const { nav } = useQuranReader();
    const isActive = nav?.currentSurah === parseInt(surahKey, 10);
    const surahNumber = parseInt(surahKey, 10);
    const { toggleSidebar } = useSidebar();

    const handleClick = () => {
        if (nav?.goToSurah) {
            nav.goToSurah(surahNumber);
        }
        toggleSidebar();
    };

    return (
        <SidebarMenuItem className="w-full">
            <SidebarMenuButton
                isActive={isActive}
                onClick={handleClick}
                className="flex items-center justify-between w-full p-4 py-7 border border-neutral-300 dark:border-neutral-300/40"
            >
                {/* Left side: Location icon and metadata */}
                <div className="flex items-center gap-3">
                    <img
                        src={
                            surah.location === 'makka'
                                ? '/makka-light.svg'
                                : '/madina-light.svg'
                        }
                        alt={surah.location}
                        className="w-7 h-7 flex-shrink-0 hidden dark:block opacity-90"
                    />
                    <img
                        src={
                            surah.location === 'makka'
                                ? '/makka-dark.svg'
                                : '/madina-dark.svg'
                        }
                        alt={surah.location}
                        className="w-7 h-7 flex-shrink-0 block dark:hidden opacity-90"
                    />

                    
                    <span className="text-xs text-muted-foreground">
                        {surah.name_en} - {surah.number_of_ayat} ayah
                    </span>
                </div>

                {/* Right side: Large Arabic name */}
                <div className="flex items-center gap-3">
                    <span
                        className="text-2xl font-kitab dark:text-white text-black"
                        dir="rtl"
                    >
                        {surah.name}
                    </span>
                </div>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
};

export default SurahToggle;
