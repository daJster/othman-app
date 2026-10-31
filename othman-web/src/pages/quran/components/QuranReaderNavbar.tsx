import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { useQuranReader } from '@/hooks/use-quran-reader';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import QuranReaderSidebar from './QuranReaderSidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import ThemeToggle from '@/components/utils/ThemeToggle';

const QuranReaderNavbarContent = () => {
    const { nav } = useQuranReader();
    const { toggleSidebar } = useSidebar();
    
    return (
        <header className="w-full h-16 flex items-center justify-between px-4 border-b border-stone-100 bg-white dark:bg-green-900 backdrop-blur-sm text-green-900 dark:text-white z-10">
            <div className="flex items-center gap-4">
                <span className="text-xs tracking-widest uppercase">
                    Surah {nav?.currentSurah} {nav?.currentAyah && `· Ayah ${nav?.currentAyah?.ayahKey}` }
                </span>
            </div>
            <div className='flex items-center '>
                <ThemeToggle/>
                <button className='p-3' onClick={toggleSidebar}>
                    <Menu size={25} />
                </button>
            </div>
        </header>
    );
};

export const QuranReaderNavbar = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <TooltipProvider>
            <div className="h-12 w-full">
                <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
                    <QuranReaderNavbarContent />
                    <QuranReaderSidebar title="Quran Reader" variant="floating" />
                </SidebarProvider>
            </div>
        </TooltipProvider>
    );
};
