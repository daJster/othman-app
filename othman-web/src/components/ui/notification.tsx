import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

const notificationVariants = cva('relative w-full rounded-lg border p-4', {
    variants: {
        variant: {
            default: 'bg-background text-foreground',
            destructive:
                'border-destructive/50 text-destructive dark:border-destructive/40',
            success: 'border-green-500/50 text-green-700 dark:text-green-400',
            warning:
                'border-yellow-500/50 text-yellow-700 dark:text-yellow-400',
        },
    },
    defaultVariants: {
        variant: 'default',
    },
});

const notificationIcons = {
    default: Info,
    destructive: XCircle,
    success: CheckCircle2,
    warning: AlertCircle,
};

interface NotificationProps
    extends
        React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof notificationVariants> {
    icon?: React.ReactNode;
}

const Notification = React.forwardRef<HTMLDivElement, NotificationProps>(
    ({ className, variant, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                role="alert"
                className={cn(notificationVariants({ variant }), className)}
                {...props}
            >
                {children}
            </div>
        );
    }
);
Notification.displayName = 'Notification';

interface NotificationHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    icon?: React.ReactNode;
}

const NotificationHeader = React.forwardRef<
    HTMLDivElement,
    NotificationHeaderProps & VariantProps<typeof notificationVariants>
>(({ className, variant, icon, children, ...props }, ref) => {
    const IconComponent = variant ? notificationIcons[variant] : null;
    return (
        <div
            ref={ref}
            className={cn('flex items-start gap-2', className)}
            {...props}
        >
            {icon !== undefined ? (
                icon
            ) : IconComponent ? (
                <IconComponent className="h-4 w-4" />
            ) : null}
            <div className="flex-1">{children}</div>
        </div>
    );
});
NotificationHeader.displayName = 'NotificationHeader';

const NotificationTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h5
        ref={ref}
        className={cn(
            'mb-1 font-medium leading-none tracking-tight',
            className
        )}
        {...props}
    />
));
NotificationTitle.displayName = 'NotificationTitle';

const NotificationDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn('text-sm [&_p]:leading-relaxed', className)}
        {...props}
    />
));
NotificationDescription.displayName = 'NotificationDescription';

export {
    Notification,
    NotificationHeader,
    NotificationTitle,
    NotificationDescription,
    notificationVariants,
};
