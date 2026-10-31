import { Outlet } from 'react-router';

import { Navbar } from '@/components/Navbar.tsx';
import { Footer } from '@/components/Footer.tsx';
import { SidebarProvider } from '@/components/ui/sidebar.tsx';
import { TooltipProvider } from '@/components/ui/tooltip.tsx';

export function MainLayout() {
    return (
        <SidebarProvider defaultOpen={false}>
            <TooltipProvider>
                <div className="flex flex-col w-full">
                    <Navbar />
                    <main>
                        <Outlet />
                    </main>
                    <Footer />
                </div>
            </TooltipProvider>
        </SidebarProvider>
    );
}
