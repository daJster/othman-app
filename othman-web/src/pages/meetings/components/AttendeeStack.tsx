import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { createAttendeeListConfig } from "@/data/configData";
import type { Attendee } from "@/types";

export function AttendeeStack({ attendees }: { attendees: Attendee[] }) {
    const config = createAttendeeListConfig();
    const visible = attendees.slice(0, config.maxVisible);
    const extra = attendees.length - config.maxVisible;

    return (
        <div className="flex items-center -space-x-2">
            {visible.map((a, i) => (
                <TooltipProvider key={i} delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Avatar
                                className={`${config.avatarSize} ${config.avatarBorder} ${config.avatarRing}`}
                            >
                                <AvatarImage src={a.avatar} alt={a.name} />
                                <AvatarFallback className={config.fallbackClass}>
                                    {a.name[0]}
                                </AvatarFallback>
                            </Avatar>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs px-2 py-1">
                            {a.name}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ))}
            {extra > 0 && (
                <span className={config.extraCountClass}>+{extra}</span>
            )}
        </div>
    );
}
