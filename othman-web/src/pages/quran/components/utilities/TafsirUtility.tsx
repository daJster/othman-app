'use client';

import { useEffect, useState } from 'react';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from '@/components/ui/drawer';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { BookOpenIcon, LanguagesIcon, BookTextIcon, Info } from 'lucide-react';
import { QURANPEDIA_BASE_URL } from '@/data/configData';
import { fetchData } from '@/lib/utils';
import { useQuranReader } from '@/hooks/use-quran-reader';
import { AyahDisplayer } from '@/components/utils/AyahDisplayer';

interface QuranPediaOption {
    id: number;
    name: string;
    author: string;
    year: number | null;
    category: { id: number; name: string };
}

interface TafsirUtilityProps {
    onClose: () => void;
}

type CONTENT_TYPES = 'surah' | 'tafsir' | 'e3rab' | 'translation';

const CONTENT_TYPE_CONFIG = [
    { value: 'surah', label: 'السورة', icon: Info },
    { value: 'tafsir', label: 'التفسير', icon: BookOpenIcon },
    { value: 'e3rab', label: 'الإعراب', icon: LanguagesIcon },
    { value: 'translation', label: 'الترجمة', icon: BookTextIcon },
] as const;

function getContentTypeLabel(type: CONTENT_TYPES): string {
    return CONTENT_TYPE_CONFIG.find((c) => c.value === type)?.label ?? '';
}

export function TafsirUtility({ onClose }: TafsirUtilityProps) {
    const { nav } = useQuranReader();
    const currentAyah = nav?.currentAyah;
    const currentAyahContent = nav?.currentAyahContent;
    const [open, setOpen] = useState(true);

    const [contentType, setContentType] = useState<CONTENT_TYPES>('tafsir');
    const [availableOptions, setAvailableOptions] = useState<
        QuranPediaOption[]
    >([]);
    const [selectedOptionId, setSelectedOptionId] = useState<number | null>(
        null
    );
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [optionsLoading, setOptionsLoading] = useState(false);

    useEffect(() => {
        if (open && currentAyah) {
            fetchAvailableOptions();
        }
    }, [open, currentAyah]);

    const fetchAvailableOptions = async () => {
        if (!currentAyah) return;
        setOptionsLoading(true);
        try {
            const url = `${QURANPEDIA_BASE_URL}/v1/ayah/${currentAyah.surah}/${currentAyah.absoluteNumber}/${contentType}`;
            const data = await fetchData<QuranPediaOption[]>(url);
            setAvailableOptions(data);
            if (data.length > 0) {
                setSelectedOptionId(data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch options:', error);
            setAvailableOptions([]);
        } finally {
            setOptionsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedOptionId && open) {
            fetchContent();
        }
    }, [selectedOptionId, open]);

    const fetchContent = async () => {
        if (!selectedOptionId || !currentAyah) return;
        setLoading(true);
        try {
            const url = `${QURANPEDIA_BASE_URL}/v1/ayah/${currentAyah.surah}/${currentAyah.ayahKey}/${contentType}?${contentType}=${selectedOptionId}`;
            const data = {text: ''}; // await fetchData<{ text?: string }[]>(url);
            if (Array.isArray(data) && data[0]?.text) {
                setContent(data[0].text);
            } else if (data && typeof data === 'object' && 'text' in data) {
                setContent((data as { text: string }).text);
            } else {
                setContent(JSON.stringify(data, null, 2));
            }
        } catch (error) {
            console.error('Failed to fetch content:', error);
            setContent('Error loading content');
        } finally {
            setLoading(false);
        }
    };

    if (!currentAyah) return null;

    return (
        <Drawer
            open={open}
            onOpenChange={(isOpen) => {
                setOpen(isOpen);
                if (!isOpen) {
                    onClose();
                }
            }}
        >
            <DrawerContent className="flex flex-col max-h-[85vh]">
                {/* Fixed Header */}
                <DrawerHeader className="flex-shrink-0 pb-2">
                    <DrawerTitle className="text-lg font-semibold">
                        {getContentTypeLabel(contentType)}
                    </DrawerTitle>
                    <DrawerDescription className="text-sm text-muted-foreground">
                        Surah {currentAyah.surah} - Ayah {currentAyah.ayahKey}
                    </DrawerDescription>
                </DrawerHeader>

                {/* Scrollable Content Area */}
                <ScrollArea className="flex-1 overflow-y-auto">
                    <div className="px-4 pb-4 space-y-4">
                        {/* Toggle Group */}
                        <div className="flex w-full justify-center">
                            <ToggleGroup
                                type="single"
                                value={contentType}
                                onValueChange={(value: string) => {
                                    if (value) {
                                        setContentType(value as CONTENT_TYPES);
                                        setSelectedOptionId(null);
                                        setContent('');
                                    }
                                }}
                                className="justify-center shadow-2xl"
                            >
                                {CONTENT_TYPE_CONFIG.map((type) => (
                                    <ToggleGroupItem
                                        key={type.value}
                                        value={type.value}
                                        aria-label={type.label}
                                        className="cursor-pointer border border-neutral-300/20 min-w-[6.25rem] min-h-[3.75rem]"
                                    >
                                        <type.icon className="size-4" />
                                        <span>{type.label}</span>
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                        </div>

                        {/* Ayah Display */}
                        {currentAyahContent && (
                            <AyahDisplayer
                                ayahContent={currentAyahContent}
                                className="rounded-md bg-muted border border-neutral-300/20"
                            />
                        )}

                        {/* Options Section */}
                        <div>
                            {optionsLoading ? (
                                <div className="flex justify-center py-8">
                                    <Spinner className="size-20" />
                                </div>
                            ) : (
                                <ScrollArea className="w-full">
                                    <div className="flex gap-2 pb-2">
                                        {availableOptions.map((option) => (
                                            <button
                                                key={option.id}
                                                onClick={() =>
                                                    setSelectedOptionId(
                                                        option.id
                                                    )
                                                }
                                                className={[
                                                    'flex-shrink-0 rounded-lg border px-3 py-1.5 text-sm transition-colors',
                                                    selectedOptionId ===
                                                    option.id
                                                        ? 'border-primary bg-primary/10 text-primary'
                                                        : 'border-border hover:bg-muted',
                                                ].join(' ')}
                                            >
                                                <div className="font-medium">
                                                    {option.name}
                                                </div>
                                                {option.author && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {option.author}
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </div>

                        {/* Content Display */}
                        <div className="min-h-[8rem]">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <Spinner className="size-6" />
                                </div>
                            ) : (
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <p className="leading-7 whitespace-pre-wrap">
                                        {content}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </ScrollArea>
            </DrawerContent>
        </Drawer>
    );
}
