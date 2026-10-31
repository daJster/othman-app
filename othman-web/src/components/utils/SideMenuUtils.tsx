import { useState } from "react";
import { cn, fullNavigate } from "@/lib/utils";
import {
    SidebarMenuItem,
    SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    ChevronDown,
} from "lucide-react";
import {type NavItem} from "@/data/configData.ts";


/** Recursive nav item — renders a collapsible if it has children */
export const NavItemRow = ({
    item
}: {
    item: NavItem;
})=> {
    const [open, setOpen] = useState(false);

    const renderNavItem = (item: NavItem) => {
        if (item.href) {
            return (
                <button
                    onClick={() => fullNavigate(item.href ?? '/')}
                    className='h-12 rounded-md border border-neutral-300/30'
                >
                    {item.Icon && <item.Icon className={'w-4 h-4'} />}
                    <span>{item.title}</span>
                    {item.badge && (
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                            {item.badge}
                        </span>
                    )}
                </button>
            )
        }

        return null
    }

    if (item.children?.length) {
        return (
            <Collapsible open={open} onOpenChange={setOpen} className="w-full">
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="w-full justify-between group">
                        <span className="flex items-center gap-2 text-neutral-800 dark:text-green-300">
                            {item.Icon && <item.Icon className="w-3.5 h-3.5"/>}
                            {item.title}
                        </span>
                        <ChevronDown
                            className={cn(
                                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                                open && "rotate-180"
                            )}
                        />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 mt-0.5 space-y-0.5 ml-3">
                    {item.children.map((child) => (
                        <SidebarMenuItem key={child.title}>
                            <NavItemRow item={child} />
                        </SidebarMenuItem>
                    ))}
                </CollapsibleContent>
            </Collapsible>
        )
    }

    return (
        <SidebarMenuButton asChild>
            {renderNavItem ? renderNavItem(item) : <a href={item.href}>{item.title}</a>}
        </SidebarMenuButton>
    );
}