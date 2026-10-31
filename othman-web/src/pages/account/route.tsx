import type { RouteObject } from "react-router-dom";
import { AccountPage } from "./AccountPage";

export const accountRoute: RouteObject = {
    path: '/account',
    element: <AccountPage />
}