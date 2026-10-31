import type { RouteObject } from 'react-router-dom';
import ProgressPage from './ProgressPage';

export const progressRoute: RouteObject = {
    path: '/account/progress',
    element: <ProgressPage />,
};
