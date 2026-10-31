export type SurahProgressInfo = {
    surahNumber: number;
    surahName: string;
    totalAyat: number;
    checkpointAyahNumber: number;
    checkpointAyah: string;
    progress: number;
    location: 'Madina' | 'Makka';
    reason: string;
};

export type SurahCell = {
    id: number;
    name: string;
    progress: number;
};
