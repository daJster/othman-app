import React from 'react';
import { Button } from '@/components/ui/button';
import { HomeIcon } from 'lucide-react';
import { fullNavigate } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

const ExitToggle: React.FC = () => {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => fullNavigate('/')}
                    className="flex w-full items-center gap-2 text-green-900 dark:text-white h-10"
                >
                    <HomeIcon className="size-4" />
                    <span>Go to Home</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
                <p>Go to Home</p>
            </TooltipContent>
        </Tooltip>
    );
};

export default ExitToggle;
