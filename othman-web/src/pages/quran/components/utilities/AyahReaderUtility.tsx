import { useState } from 'react';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AudioReader } from '@/components/utils/AudioReader';
import { createShaykhListConfig, type Shaykh } from '@/data/configData';
import { useQuranReader } from '@/hooks/use-quran-reader';

export function QuranAyahReader() {
    const { defaultReader, readers } = createShaykhListConfig();
    const { nav } = useQuranReader();
    const currentAyah = nav?.currentAyah ?? null;
    const [selectedShaykhId, setSelectedShaykhId] = useState<string>(
        defaultReader.identifier
    );
    const [autoReadEnabled, setAutoReadEnabled] = useState(false);

    if (!currentAyah) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="bg-white/95 dark:bg-muted/95 backdrop-blur-sm font-sans rounded-xl px-3 py-5 shadow-2xl border border-neutral-200 dark:border-green-700/50 ring-1 ring-black/5 dark:ring-white/10"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center justify-center gap-2">
                    <Switch
                        id="auto-read"
                        checked={autoReadEnabled}
                        onCheckedChange={setAutoReadEnabled}
                        className="min-h-7 min-w-12"
                    />
                    <Label
                        htmlFor="auto-read"
                        className="text-neutral-500 dark:text-white text-md font-medium cursor-pointer"
                    >
                        Auto
                    </Label>
                </div>

                <Select
                    value={selectedShaykhId ?? ''}
                    onValueChange={setSelectedShaykhId}
                >
                    <SelectTrigger className="w-full min-h-10 max-w-58 text-md bg-white border border-neutral-300/20 text-neutral-800 dark:text-white">
                        <SelectValue placeholder="Select Shaykh">
                            {selectedShaykhId
                                ? readers.find(
                                    (r: Shaykh) =>
                                        r.identifier === selectedShaykhId
                                )?.name
                                : 'Select Shaykh'}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent
                        position="item-aligned"
                        className="border-neutral-300/50 dark:border-neutral-700/50 drop-shadow-xl max-h-60"
                    >
                        {readers.map((r: Shaykh) => (
                            <SelectItem
                                key={r.identifier}
                                value={r.identifier}
                                className="min-h-10 rounded-none font-sans font-medium dark:text-white text-neutral-700 text-md"
                            >
                                {r.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            
            <AudioReader
                key={selectedShaykhId}
                audioFn={async () =>
                    nav?.ayahAudioFn(
                        currentAyah.absoluteNumber,
                        selectedShaykhId
                    ) ?? null
                }
                autoReadEnabled={autoReadEnabled}
                onNext={() =>
                    nav?.goToAbsoluteAyah(currentAyah.absoluteNumber + 1)
                }
                onPrev={() =>
                    nav?.goToAbsoluteAyah(currentAyah.absoluteNumber - 1)
                }
            />
        </motion.div>
    );
}
