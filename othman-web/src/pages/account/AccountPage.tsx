import { useAuth } from '@/hooks/use-auth';
import { AccountCard } from '@/components/ui/account-card';
import { AccountCardSkeleton } from '@/components/skeleton';
import { EditAccountDrawer } from './components/EditAccountDrawer';
import { PenIcon } from 'lucide-react';
import { Drawer, DrawerTrigger } from '@/components/ui/drawer';
import { createAccountSettingsNavConfig } from '@/data/configData';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export function AccountPage() {
    const { account } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const settingsNav = createAccountSettingsNavConfig();

    return (
        <div className="container mx-auto p-4 space-y-4 max-w-3xl">
            {/* HEADER */}
            <div>
                {account ? (
                    <Drawer>
                        <DrawerTrigger asChild>
                            <AccountCard
                                account={account}
                                icon={PenIcon}
                                className="w-full"
                            />
                        </DrawerTrigger>
                        <EditAccountDrawer account={account} />
                    </Drawer>
                ) : (
                    <AccountCardSkeleton />
                )}
            </div>

            {/* SETTINGS GROUPS */}
            <div className="flex flex-col gap-3">
                {settingsNav.map((group, groupIndex) => (
                    <Card
                        key={groupIndex}
                        className={`flex flex-col p-3 border ring-0 rounded-md border-neutral-500/40 dark:border-neutral-300/30 transition-colors hover:bg-muted/50`}
                    >
                        {group.map((item, itemIndex) => (
                            <Button
                                key={itemIndex}
                                variant="ghost"
                                onClick={() => {navigate(item.href ?? "/")}}
                                className={`flex items-center justify-start rounded-none p-0 ${
                                    itemIndex === 0
                                        ? 'rounded-t-lg'
                                        : itemIndex === group.length - 1
                                          ? 'rounded-b-lg'
                                          : ''
                                } ${
                                    item.variant === 'destructive'
                                        ? 'text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30'
                                        : ''
                                }`}
                            >
                                {item.Icon && (
                                    <item.Icon className="mr-2 h-4 w-4" />
                                )}
                                <span>{t(item.title)}</span>
                            </Button>
                        ))}
                    </Card>
                ))}
            </div>
        </div>
    );
}
