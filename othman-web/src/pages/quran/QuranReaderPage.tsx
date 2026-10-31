import { useState, useCallback, useEffect } from 'react';
import { useQuranReader } from '@/hooks/use-quran-reader';
import { useSwipe } from '@/hooks/use-swipe';
import { QuranPage, type PageDirection } from './components/QuranPage';
import { QuranReaderNavbar } from './components/QuranReaderNavbar';
import { QuranReaderFooter } from './components/QuranReaderFooter';
import { QuranReaderUtilities } from './components/QuranReaderUtilities';
import type { Ayah } from '@/providers/QuranReaderProvider';

export const QuranReaderPage = () => {
    const { nav, selectedEdition } = useQuranReader();
    const [direction, setDirection] = useState<PageDirection>(null);

    // Quran pages go RTL: next page = lower number in RTL contexts,
    // but we follow the nav helpers directly.
    const navigate = useCallback((fn: () => void, dir: PageDirection) => {
        setDirection(dir);
        fn();
    }, []);

    const handleNext = useCallback(
        () => navigate(nav!.goNextPage, 'right'),
        [nav, navigate]
    );

    const handlePrev = useCallback(
        () => navigate(nav!.goPrevPage, 'left'),
        [nav, navigate]
    );

    const handleAyahSelect = useCallback(
        (ayah: Ayah) => {
            nav?.goToAbsoluteAyah(ayah.absoluteNumber);
        },
        [nav]
    );

    const handleClearSelection = useCallback(() => {
        nav?.goToAbsoluteAyah(null);
    }, [nav]);

    const swipe = useSwipe(handleNext, handlePrev);

    // Keyboard navigation
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') handleNext();
            if (e.key === 'ArrowRight') handlePrev();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleNext, handlePrev]);

    if (!nav) return null;

    const page = nav.currentPage;

    // Desktop: odd = right page, even = left page
    // If odd, show page on right + page-1 on left
    // If even, show page on left + page+1 on right
    const rightPage = page % 2 !== 0 ? page : page + 1;
    const leftPage = rightPage + 1;

    return (
        <div
            className="relative w-full min-h-screen overflow-hidden"
            style={{
                fontFamily: "'Georgia', serif",
                backgroundColor: selectedEdition?.theme_color,
            }}
        >
            <div className="flex flex-col items-center justify-between w-full min-h-screen">
                <QuranReaderNavbar />

                {/* MOBILE: single full-screen page with swipe */}
                <div
                    className={`md:hidden flex items-center w-full overflow-hidden`}
                    {...swipe}
                >
                    <QuranPage
                        key={`current-${page}`}
                        src={nav.pageImageUrl(page)}
                        alt={`Page ${page}`}
                        direction={direction}
                        side="full"
                        selectedAyahKey={nav.currentAyah?.ayahKey ?? null}
                        onAyahSelect={handleAyahSelect}
                        onClearSelection={handleClearSelection}
                    />
                </div>

                {/* DESKTOP: two-page spread, centered */}
                <div className="hidden md:flex flex-1 items-center justify-center w-full px-6 py-4 gap-1 max-w-5xl mx-auto">
                    {/* Left page (even number) */}
                    <div
                        className="flex-1 max-h-[calc(100vh-9rem)] overflow-hidden"
                    >
                        <QuranPage
                            src={nav.pageImageUrl(leftPage)}
                            alt={`Page ${leftPage}`}
                            direction={direction}
                            side="right"
                            selectedAyahKey={nav.currentAyah?.ayahKey ?? null}
                            onAyahSelect={handleAyahSelect}
                            onClearSelection={handleClearSelection}
                        />
                    </div>

                    {/* Spine shadow */}
                    <div className="w-px self-stretch bg-linear-to-b from-transparent via-stone-300 to-transparent mx-1 rotate-180" />

                    {/* Right page (odd number) */}
                    <div
                        className="flex-1 max-h-[calc(100vh-9rem)] overflow-hidden"
                    >
                        <QuranPage
                            src={nav.pageImageUrl(rightPage)}
                            alt={`Page ${rightPage}`}
                            direction={direction}
                            side="left"
                            selectedAyahKey={nav.currentAyah?.ayahKey ?? null}
                            onAyahSelect={handleAyahSelect}
                            onClearSelection={handleClearSelection}
                        />
                    </div>
                </div>

                {/* Bottom Navigation  */}
                <QuranReaderFooter
                    handleNext={handleNext}
                    handlePrev={handlePrev}
                />
            </div>

            {/* Utilities overlay - absolute with h-screen, z above all */}
            <div className="absolute inset-0 h-screen z-50 pointer-events-none">
                <div
                    className="pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <QuranReaderUtilities />
                </div>
            </div>
        </div>
    );
};
