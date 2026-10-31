import type {RouteObject} from "react-router";
import { QuranReaderProvider } from "@/providers";
import { QuranReaderPage } from "./QuranReaderPage";

export const quranReaderRoute: RouteObject = {
    path: '/quran',
    element: (
        <QuranReaderProvider>
            <QuranReaderPage />
        </QuranReaderProvider>
    ),
};
