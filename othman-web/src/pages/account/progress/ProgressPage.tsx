import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SurahHeatmap } from './components/SurahHeatmap';
import { SurahProgressSummary } from './components/SurahProgressSummary';
import type { SurahProgressInfo } from './types';
import { useTranslation } from 'react-i18next';
import { NotFound } from '@/components/exception/NotFound';

const mockSurahData: Record<number, SurahProgressInfo> = {
    1: {
        surahNumber: 1,
        surahName: 'Al-Fatiha',
        totalAyat: 7,
        checkpointAyahNumber: 5,
        checkpointAyah: 'اهدنا الصراط المستقيم',
        progress: 70,
        location: 'Makka',
        reason: 'سورة عظيمة تُقرأ في كل صلاة',
    },
    2: {
        surahNumber: 2,
        surahName: 'Al-Baqarah',
        totalAyat: 286,
        checkpointAyahNumber: 10,
        checkpointAyah: 'اليسع',
        progress: 45,
        location: 'Madina',
        reason: 'أطول سورة في القرآن',
    },
};

export default function ProgressPage() {
    const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { t } = useTranslation()

    const selectedData = selectedSurah ? mockSurahData[selectedSurah] : null;

    const handleSelect = (surahNumber: number) => {
        setSelectedSurah(surahNumber);
        setDrawerOpen(true);
    };

    return (
        <div className="flex justify-center w-full px-6 py-4">
            <div className='w-full max-w-3xl space-y-6'>
                <div className="flex w-full justify-center">
                    <Card className='max-w-4xl w-full'>
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-center">
                                {t('pages.account.progress.title')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <SurahHeatmap
                                selectedSurah={selectedSurah}
                                onSelect={handleSelect}
                            />
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-md font-semibold p-0 m-0">
                            {t('pages.account.progress.recentTasks.title')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <NotFound label='recent Tasks'/>
                    </CardContent>
                </Card>

                <SurahProgressSummary
                    data={selectedData}
                    open={drawerOpen}
                    onOpenChange={setDrawerOpen}
            />
            </div>
        </div>
    );
}
