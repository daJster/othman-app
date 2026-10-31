import { createQuranPageScaleConfig } from '@/data/configData';
import { useQuranReader } from '@/hooks/use-quran-reader';
import type { EditionBboxesReversed } from '@/providers';
import type { Ayah } from '@/providers/QuranReaderProvider';

interface AyahOverlayProps {
    pageKey: number;
    ayat: EditionBboxesReversed[string]['ayat'];
    selectedAyahKey: string | null;
    onAyahSelect: (ayah: Ayah) => void;
}

export function AyahOverlay({
    pageKey,
    ayat,
    selectedAyahKey,
    onAyahSelect,
}: AyahOverlayProps) {
    const { selectedEdition } = useQuranReader();
    const pageSize = selectedEdition
        ? createQuranPageScaleConfig()[selectedEdition.name]?.size
        : null;

    if (!pageSize) return null;

    return (
        <div
            className="absolute pointer-events-none"
            style={{
                height: pageSize.height,
                width: pageSize.width,
            }}
        >
            {Object.entries(ayat).map(([ayahKey, ayah]) =>
                ayah.bboxes.map((bbox, bboxIdx) => {
                    const left = bbox.left * pageSize.width;
                    const top = bbox.top * pageSize.height;
                    const width = (bbox.right - bbox.left) * pageSize.width;
                    const height = (bbox.bottom - bbox.top) * pageSize.height;
                    const isSelected = ayahKey === selectedAyahKey;

                    return (
                        <button
                            key={`${ayahKey}-${bboxIdx}`}
                            className={[
                                'absolute pointer-events-auto transition-all duration-150',
                                isSelected
                                    ? 'bg-green-700/20'
                                    : 'bg-transparent hover:bg-green-300/20',
                            ].join(' ')}
                            style={{ top, left, width, height }}
                            aria-label={`Ayah ${ayahKey}, Surah ${ayah.surah}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onAyahSelect({
                                    pageKey,
                                    ayahKey,
                                    surah: ayah.surah,
                                    absoluteNumber: ayah.absolute_number,
                                });
                            }}
                        />
                    );
                })
            )}
        </div>
    );
}
