import { useQuranReader } from "@/hooks/use-quran-reader";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type React from "react";

type QuranReaderFooterProps = {
    handleNext: () => void;
    handlePrev: () => void;
}

export const QuranReaderFooter: React.FC<QuranReaderFooterProps> = ({handleNext, handlePrev}) => {
    const { nav, selectedEdition } = useQuranReader()

    return (
        <footer className="w-full flex items-center justify-between px-6 py-4 border-t border-stone-100 bg-white dark:bg-green-900 backdrop-blur-sm text-green-900 dark:text-white">
            <button
                className="p-2"
                onClick={handleNext}
            >
                <ChevronLeft size={25}/>
            </button>

            {/* Page indicator */}
            <p className="text-xs tracking-widest  transition-colors duration-150 tabular-nums">
                {nav?.formatPageNumber(nav?.currentPage)} / {' '}
                {selectedEdition?.last_page}
            </p>

            <button
                className="p-2"
                onClick={handlePrev}
            >
                <ChevronRight size={25}/>
            </button>
        </footer>
    )
}