import { CircleXIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type NotFoundProps = {
    label: string;
    className?: string;
};

export function NotFound({ label, className }: NotFoundProps) {
    return (
        <div
            className={cn(
                'flex items-center justify-center gap-3 text-center rounded-md bg-muted/50 text-neutral-500 border-neutral-300 border dark:bg-green-800 dark:text-neutral-100 dark:border-neutral-300/30 p-2',
                className
            )}
        >
            <CircleXIcon className="size-5" />
            <p>No {label} has been found.</p>
        </div>
    );
}
