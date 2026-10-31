import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';
import { arSA, enUS } from 'react-day-picker/locale';
import { useTranslation } from 'react-i18next';
import { MeetingsList } from '@/pages/meetings/components/MeetingsList.tsx';
import { useMeetingsContext } from '@/hooks/use-meetings.ts';

const locales = {
    ar: arSA,
    en: enUS,
} as const;

export const MeetingsPage = () => {
    const { t, i18n } = useTranslation();
    const { selectedDate, fetchMeetings } = useMeetingsContext();
    const [date, setDate] = useState<Date | undefined>(selectedDate);

    const bookedDates = Array.from(
        { length: 15 },
        (_, i) => new Date(new Date().getFullYear(), 1, 12 + i)
    );

    const handleDateSelect = (newDate: Date | undefined) => {
        setDate(newDate);
        if (newDate) {
            fetchMeetings(newDate);
        }
    };

    return (
        <div className="flex flex-col mt-14 items-center justify-start min-h-screen text-black dark:bg-green-900">
            <div className="space-y-1 flex flex-col items-center justify-start pt-10">
                <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-slate-50">
                    {t('page.meetings.header.title')}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('page.meetings.header.description')}
                </p>
            </div>

            <div className="py-5 w-full">
                <Card className="mx-auto w-fit" size={'sm'}>
                    <CardContent className="p-0">
                        <Calendar
                            mode="single"
                            defaultMonth={date}
                            selected={date}
                            onSelect={handleDateSelect}
                            disabled={bookedDates}
                            dir={i18n.dir()}
                            locale={
                                i18n.dir() === 'rtl'
                                    ? locales[
                                          i18n.language as keyof typeof locales
                                      ]
                                    : undefined
                            }
                            className={
                                'rounded-lg [--cell-size:2.75rem] md:[--cell-size:3rem]'
                            }
                            modifiers={{
                                booked: bookedDates,
                            }}
                            modifiersClassNames={{
                                booked: '[&>button]:line-through opacity-100',
                            }}
                        />
                    </CardContent>
                </Card>
            </div>

            <div className="px-5 w-full">
                <MeetingsList />
            </div>
        </div>
    );
};
