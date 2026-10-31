import type { RouteObject } from 'react-router';

import { MainLayout, MinimalLayout } from '@/layouts';
import { homeRoute } from '@/pages/home/route';
import { Navigate } from 'react-router-dom';
import { ErrorGuardPage } from '@/router/guards';
import { SignInRoute, LogoutRoute } from '@/pages/auth';
import { quranReaderRoute } from '@/pages/quran';
import { accountRoute } from '@/pages/account';
import { progressRoute } from '@/pages/account/progress';
import { meetingsRoute } from '@/pages/meetings';

const publicRoutes: RouteObject[] = [homeRoute, SignInRoute, LogoutRoute];

const privateRoutes: RouteObject[] = [meetingsRoute];

const errorRoutes: RouteObject[] = [
    { path: '/error/:code', element: <ErrorGuardPage /> },
    { path: '*', element: <Navigate to="/error/404" replace /> },
];

export const routes: RouteObject[] = [
    {
        element: <MainLayout />,
        children: [...publicRoutes, ...privateRoutes, ...errorRoutes],
    },
    {
        element: <MinimalLayout />,
        children: [
            accountRoute,
            progressRoute,
        ],
    },
    quranReaderRoute
];
