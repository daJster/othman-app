import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';

export function MeetingCardSkeleton() {
    return (
        <Card className="relative overflow-hidden border border-slate-200 dark:border-neutral-800 bg-white dark:bg-green-950 shadow-none opacity-70">
            <div className="absolute left-0 top-0 bottom-0 w-2 rounded-l-xl bg-slate-300 dark:bg-slate-600 opacity-40" />

            <CardHeader className="pl-5 pr-4 pt-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pl-5 pr-4 space-y-3">
                <div className="flex items-center gap-3 flex-wrap text-xs">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                </div>

                <Separator className="bg-slate-100 dark:bg-slate-200/30" />

                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-slate-500 dark:text-slate-200" />
                        <div className="flex -space-x-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton
                                    key={i}
                                    className="size-6 rounded-full border-2 border-white dark:border-green-950"
                                />
                            ))}
                        </div>
                        <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-3 w-14" />
                </div>

                <div className="flex items-center gap-2">
                    <Skeleton className="h-10 flex-1 rounded-lg" />
                    <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
            </CardContent>
        </Card>
    );
}
