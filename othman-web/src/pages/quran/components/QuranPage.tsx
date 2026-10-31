import { useQuranReader } from '@/hooks/use-quran-reader';
import { AyahOverlay } from './AyahOverlay';
import { type Ayah } from '@/providers/QuranReaderProvider';
import { useMemo, useCallback } from 'react';
import { createQuranPageScaleConfig } from '@/data/configData';

export type PageDirection = 'left' | 'right' | null;

export const DURATION = 200;

export interface QuranPageProps {
    src: string;
    alt: string;
    direction: PageDirection;
    animClass?: string | null;
    side?: 'left' | 'right' | 'full';
    selectedAyahKey: string | null;
    onAyahSelect: (ayah: Ayah) => void;
    onClearSelection: () => void;
}

const slideIn: Record<
    NonNullable<PageDirection>,
    Record<'left' | 'right' | 'full', string>
> = {
    left: {
        full: 'animate-slide-in-left',
        left: 'animate-slide-in-left',
        right: 'animate-slide-in-left',
    },
    right: {
        full: 'animate-slide-in-right',
        left: 'animate-slide-in-right',
        right: 'animate-slide-in-right',
    },
};

export function QuranPage({
    src,
    alt,
    direction,
    side = 'full',
    animClass = null,
    selectedAyahKey,
    onAyahSelect,
    onClearSelection,
}: QuranPageProps) {
    const resolvedAnimClass =
        animClass ?? (direction ? slideIn[direction][side] : '');
    const { nav, bboxesPerPage, selectedEdition } = useQuranReader();
    const pageKey = nav?.currentPage;

    const pageAyat = pageKey ? bboxesPerPage?.[pageKey]?.ayat : null;

    const quranPageScaleConfig = useMemo(
        () => createQuranPageScaleConfig(),
        []
    );

    const pageSize = selectedEdition
        ? quranPageScaleConfig[selectedEdition.name]?.size
        : null;

    const handleContainerClick = useCallback(() => {
        onClearSelection();
    }, [onClearSelection]);

    return (
        <div
            className={`relative h-full w-full max-w-xl flex items-center justify-center quran-page-container ${resolvedAnimClass}`}
            onClick={handleContainerClick}
            style={{
                animationDuration: `${DURATION}ms`,
                animationFillMode: 'both',
            }}
        >
            <img
                src={src}
                alt={alt}
                style={{
                    height: pageSize?.height,
                    width: pageSize?.width,
                }}
                draggable={false}
            />

            {pageKey && pageAyat && (
                <AyahOverlay
                    pageKey={pageKey}
                    ayat={pageAyat}
                    selectedAyahKey={selectedAyahKey}
                    onAyahSelect={onAyahSelect}
                />
            )}
        </div>
    );
}
