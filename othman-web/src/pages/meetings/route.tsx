import type {RouteObject} from "react-router";
import {MeetingsPage} from "./MeetingsPage";
import { MeetingsProvider } from "@/providers";

export const meetingsRoute: RouteObject = {
    path: '/kuttab',
    element: (
        <MeetingsProvider>
            <MeetingsPage />
        </MeetingsProvider>
    ),
};
