import {
    useState,
    useCallback,
    type ButtonHTMLAttributes,
    type ReactNode,
} from 'react';

import { Button } from './button';
import { Spinner } from './spinner';

type ButtonVariant =
    | 'default'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'destructive'
    | 'link';

type ButtonSize =
    | 'default'
    | 'xs'
    | 'sm'
    | 'lg'
    | 'icon'
    | 'icon-xs'
    | 'icon-sm'
    | 'icon-lg';

interface DeferredButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    asyncFn: () => Promise<unknown>;
    onResolve?: (result: unknown) => void;
    onReject?: (error: Error) => void;
    loadingSpinner?: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
}

export function DeferredButton({
    className,
    variant = 'default',
    size = 'default',
    asyncFn,
    onResolve,
    onReject,
    loadingSpinner,
    disabled,
    children,
    ...props
}: DeferredButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleClick = useCallback(async () => {
        if (loading) return;

        setLoading(true);
        try {
            const result = await asyncFn();
            onResolve?.(result);
        } catch (error) {
            const err =
                error instanceof Error
                    ? error
                    : new Error('Async function failed');
            onReject?.(err);
        } finally {
            setLoading(false);
        }
    }, [loading, asyncFn, onResolve, onReject]);

    return (
        <Button
            className={className}
            variant={variant}
            size={size}
            disabled={disabled || loading}
            onClick={handleClick}
            {...props}
        >
            {loading ? (
                <span className="flex items-center justify-center gap-2">
                    {loadingSpinner ?? <Spinner />}
                </span>
            ) : (
                children
            )}
        </Button>
    );
}
