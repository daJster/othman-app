import type { RouteObject } from 'react-router';

import { HomePage } from '@/pages/home';

export const homeRoute: RouteObject = {
    path: '/',
    element: <HomePage />,
};
