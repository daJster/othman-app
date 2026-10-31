// import { FacebookAuthToggle } from "@/pages/auth/components/FacebookAuthToggle";
import { GoogleAuthToggle } from "@/pages/auth/components/GoogleAuthToggle";
import type { ComponentType } from "react";

export type AuthProvider = {
    id: string;
    labelKey: string;
    icon: string;
    iconAlt: string;
    Component: ComponentType;
};

export const AUTH_PROVIDERS: Record<string, AuthProvider> = {
    google: {
        id: 'google',
        labelKey: 'action.auth.google',
        icon: '/google.svg',
        iconAlt: 'Google',
        Component: GoogleAuthToggle,
    },
    // facebook: {
    //     id: 'facebook',
    //     labelKey: 'action.auth.facebook',
    //     icon: '/facebook.svg',
    //     iconAlt: 'Facebook',
    //     Component: FacebookAuthToggle,
    // },
};

export const AUTH_PROVIDER_LIST = Object.values(AUTH_PROVIDERS);