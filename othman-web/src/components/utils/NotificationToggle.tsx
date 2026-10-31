import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Badge, Bell} from "lucide-react";
import {cn} from "@/lib/utils.ts";

interface Notification {
    id: string;
    message: string;
    read: boolean;
}

const NotificationToggle = ({
          notifications = [],
          onNotificationClick,
      }: {
    notifications?: Notification[];
    onNotificationClick?: (id: string) => void;
})=> {
    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                            <Bell className="h-4 w-4" />
                            {unreadCount > 0 && (
                                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-emerald-600 hover:bg-emerald-600">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </Badge>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right"><p>Notifications</p></TooltipContent>
            </Tooltip>

            <DropdownMenuContent align="start" className="w-72">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Notifications
                </div>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        No notifications
                    </div>
                ) : (
                    notifications.map((n) => (
                        <DropdownMenuItem
                            key={n.id}
                            onClick={() => onNotificationClick?.(n.id)}
                            className={cn("text-sm py-2.5", !n.read && "font-medium")}
                        >
                            <span className={cn("mr-2 h-1.5 w-1.5 rounded-full shrink-0", n.read ? "bg-transparent" : "bg-emerald-500")} />
                            {n.message}
                        </DropdownMenuItem>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}