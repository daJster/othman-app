import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenu,
    SidebarFooter,
} from '@/components/ui/sidebar';
import { cn, fullNavigate } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    createDefaultNavConfig,
    type NavConfig,
    type NavItem,
} from '@/data/configData.ts';
import React from 'react';
import { NavItemRow } from '@/components/utils/SideMenuUtils.tsx';
import { Button } from '@/components/ui/button.tsx';
import { AccountCard } from '@/components/ui/account-card.tsx';
import { useTranslation } from 'react-i18next';
import {
    LogOutIcon,
    SquareArrowOutUpRightIcon,
    SettingsIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

export interface SidebarWrapperProps {
    title?: string;
    showCloseButton?: boolean;
    variant?: 'sidebar' | 'floating';
}

const SideMenu: React.FC<SidebarWrapperProps> = ({
    title = '',
    variant = 'sidebar',
}) => {
    const maxTitleLength = 20;
    const isLong = title.length > maxTitleLength;
    const { t } = useTranslation();
    const { account } = useAuth();
    const navConfig: NavConfig = createDefaultNavConfig();
    const { theme } = useTheme();

    const role: string = account?.role || 'guest';
    const navItems: NavItem[] = navConfig[role] || navConfig.guest;

    const AuthToggle = () => (
        <div className="flex w-full items-center gap-3 justify-center">
            <Button
                onClick={() => fullNavigate('/signin')}
                className={`flex-1 h-10 rounded-xl transition bg-white text-black shadow-sm`}
            >
                <p>{t('action.signinRedirect')}</p>
            </Button>
        </div>
    );

    const LogoutToggle = () => (
        <div className="flex w-full items-center gap-3 justify-end">
            <Button
                onClick={() => fullNavigate('/logout')}
                className={`flex gap-2 rounded-md transition py-5 bg-red-500 dark:bg-red-500/60 dark:text-white text-black shadow-sm`}
            >
                <p>{t('action.logout')}</p>
                <LogOutIcon />
            </Button>
        </div>
    );

    return (
        <div className='absolute top-0 left-0 min-h-screen'>
            <Sidebar
                variant={variant}
                className={cn(
                    'absolute h-full w-full duration-400 ease-in-out'
                )}
            >
                <SidebarContent className="flex flex-col justify-between h-full dark:bg-green-800/30">
                    <SidebarGroup className={'flex flex-col gap-2'}>
                        <SidebarGroupLabel className="flex flex-row justify-between w-full">
                            {isLong ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="text-lg font-bold text-black dark:text-white">
                                            {title.slice(0, maxTitleLength)}...
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{title}</p>
                                    </TooltipContent>
                                </Tooltip>
                            ) : (
                                <span className="text-lg font-bold text-black dark:text-white">
                                    {title}
                                </span>
                            )}
                        </SidebarGroupLabel>
                        {account ? (
                            <AccountCard
                                account={account}
                                onClick={() => fullNavigate('/account')}
                                icon={SquareArrowOutUpRightIcon}
                            />
                        ) : (
                            <AuthToggle />
                        )}
                        <SidebarGroupContent>
                            <SidebarMenu className="space-y-1">
                                <div className='flex items-center justify-center w-full'>
                                </div>
                                {[...navItems].map((item) => (
                                    <NavItemRow key={item.title} item={item} />
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                    <SidebarFooter className="flex flex-row justify-between">
                        <button
                            onClick={() => fullNavigate('/account/settings')}
                            className="flex items-center justify-center px-2"
                        >
                            <SettingsIcon className='h-5 w-5'/>
                        </button>
                        <LogoutToggle />
                    </SidebarFooter>
                </SidebarContent>
            </Sidebar>
        </div>
    );
};

export default SideMenu;
