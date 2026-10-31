import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
} from '@/components/ui/drawer';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import type { SurahProgressInfo } from '../types';

type SurahProgressSummaryProps = {
    data: SurahProgressInfo | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function SurahProgressSummary({
    data,
    open,
    onOpenChange,
}: SurahProgressSummaryProps) {
    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className='max-w-2xl mx-auto'>
                <DrawerHeader className="text-left">
                    <DrawerTitle className="flex items-center justify-between">
                        <span>
                            {data?.surahNumber}. {data?.surahName}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            {data?.location}
                        </span>
                    </DrawerTitle>
                    <DrawerDescription className="sr-only">
                        Surah progress details
                    </DrawerDescription>
                </DrawerHeader>

                <div className="px-4 pb-4 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <Progress
                            value={data?.progress ?? 0}
                            className="h-3 flex-1"
                        />
                        <span className="text-sm font-medium tabular-nums">
                            {data?.progress}%
                        </span>
                    </div>

                    <div className="text-sm space-y-1">
                        <p>
                            <strong>Ayat:</strong> {data?.totalAyat}
                        </p>
                        <p>
                            <strong>Checkpoint:</strong> {data?.checkpointAyahNumber}
                        </p>
                        <p className="text-muted-foreground text-xs line-clamp-2">
                            {data?.checkpointAyah}
                        </p>
                    </div>

                    <div className="text-right text-sm leading-relaxed">
                        <p className="font-medium">{data?.reason}</p>
                    </div>
                </div>

                <DrawerFooter>
                    <Button className="w-full flex items-center justify-center gap-2 h-15">
                        Continue
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
