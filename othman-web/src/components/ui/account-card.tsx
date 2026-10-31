import type { ComponentProps } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

import type { AccountData } from '@/firebase/auth/type';

interface AccountCardProps extends ComponentProps<'button'> {
    account: AccountData;
    icon?: LucideIcon;
}

function getInitials(name: string | null): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

function AccountCard({
    account,
    className,
    icon: Icon,
    ...props
}: AccountCardProps) {
    const { email, displayName, photoURL } = account;
    return (
        <button {...props} className={cn('block', className)}>
            <Card className="flex flex-row border ring-0 rounded-md border-neutral-500/40 dark:border-neutral-300/30 cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50">
                <div className='flex items-center gap-4'>
                    <Avatar size="lg">
                        {photoURL && (
                            <AvatarImage
                                src={photoURL}
                                alt={displayName ?? email ?? undefined}
                            />
                        )}
                        <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col text-start">
                        <span className="truncate font-medium">
                            {displayName ?? 'No name'}
                        </span>
                        <span className="truncate text-sm text-muted-foreground">
                            {email}
                        </span>
                    </div>
                </div>
                <div className='p-3'>
                    {Icon && (
                        <Icon className="h-5 w-5 ml-5 text-neutral-600 dark:text-slate-200" />
                    )}
                </div>
            </Card>
        </button>
    );
}

export { AccountCard };
