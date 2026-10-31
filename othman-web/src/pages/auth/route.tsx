import type {RouteObject} from "react-router";
import {SignInPage} from "@/pages/auth/SignIn";
import { LogoutPage } from "./Logout";

export const SignInRoute: RouteObject = {
    path: '/signin',
    element: <SignInPage />,
};

export const LogoutRoute: RouteObject = {
    path: '/logout',
    element: <LogoutPage />,
};
