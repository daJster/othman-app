import { MeetingCard } from './MeetingCard';
import { useTranslation } from 'react-i18next';
import { CircleXIcon } from 'lucide-react';
import { useMeetingsContext } from '@/hooks/use-meetings';
import { motion } from 'framer-motion';
import { Spinner } from '@/components/ui/spinner';

const cardVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: i * 0.08,
            duration: 0.4,
            ease: [0.25, 0.1, 0.25, 1] as const,
        },
    }),
};

const renderContainer = (children: React.ReactNode) => (
    <div className="px-3 pt-2 pb-10 font-sans">
        <div className="mx-auto max-w-xl space-y-6">
            <div className="flex-1 h-px bg-slate-500 dark:bg-slate-200/50" />
            {children}
        </div>
    </div>
);

export const MeetingsList = () => {
    const { t } = useTranslation();
    const { meetings, loading } = useMeetingsContext();

    if (loading) {
        return renderContainer(
            <div className="flex w-full justify-center space-y-2.5">
                <Spinner className="h-10 w-10 dark:text-slate-100 text-green-700" />
            </div>
        );
    }

    if (meetings.length === 0) {
        return renderContainer(
            <div className="flex items-center justify-center gap-2 dark:text-slate-100 text-green-700">
                <CircleXIcon className="h-5 w-5" />
                <p className="text-sm">
                    {t('page.meetings.list.empty', {
                        defaultValue: 'No meetings found',
                    })}
                </p>
            </div>
        );
    }

    return renderContainer(
        <section className="space-y-3">
            <p className="text-xs border-slate-500 dark:border-slate-200 text-slate-500 dark:text-slate-100 px-1.5 py-0">
                {meetings.length} Meetings found
            </p>
            <div className="space-y-2.5">
                {meetings.map((m, i) => (
                    <motion.div
                        key={m.id}
                        custom={i}
                        initial="hidden"
                        animate="visible"
                        variants={cardVariants}
                    >
                        <MeetingCard meeting={m} />
                    </motion.div>
                ))}
            </div>
        </section>
    );
};
