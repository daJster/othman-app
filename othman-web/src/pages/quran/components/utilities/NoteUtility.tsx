'use client';

import { useState, useMemo } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StickyNoteIcon, Send, Info } from 'lucide-react';
import { useQuranReader } from '@/hooks/use-quran-reader';
import mockNotes from '@/data/mock/mockQuranNotes.json';

interface QuranNote {
    id: string;
    surah: number;
    ayah: number;
    person: { name: string; avatar?: string };
    timestamp: string;
    text: string;
}

interface NoteUtilityProps {
    onClose: () => void;
}

export function NoteUtility({ onClose }: NoteUtilityProps) {
    const { nav } = useQuranReader();
    const currentAyah = nav?.currentAyah;
    const [open, setOpen] = useState(true);
    const [notes, setNotes] = useState<QuranNote[]>(mockNotes.notes);
    const [newNote, setNewNote] = useState('');

    const filteredNotes = useMemo(() => {
        if (!currentAyah) return [];
        return notes.filter(
            (note) =>
                note.surah === currentAyah.surah &&
                note.ayah === currentAyah.absoluteNumber
        );
    }, [notes, currentAyah]);

    const handlePostNote = () => {
        if (!newNote.trim() || !currentAyah) return;

        const note: QuranNote = {
            id: Date.now().toString(),
            surah: currentAyah.surah,
            ayah: currentAyah.absoluteNumber,
            person: {
                name: 'Jad',
                avatar: 'JE',
            },
            timestamp: new Date().toISOString(),
            text: newNote.trim(),
        };

        setNotes([...notes, note]);
        setNewNote('');
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (!currentAyah) return null;

    return (
        <Sheet open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
                onClose();
            }
        }}>
            <SheetContent
                side="right"
                className="w-full sm:w-[400px] flex flex-col p-0 border-neutral-300/50"
            >
                <SheetHeader className="p-4 pb-2 border-b border-neutral-300/20">
                    <SheetTitle className="flex items-center gap-2">
                        <StickyNoteIcon className="size-6" />
                        <p>Notes</p>
                    </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-[calc(100vh-180px)] px-4 pt-4">
                        {filteredNotes.length === 0 ? (
                            <div className="flex flex-col w-full items-center text-center text-muted-foreground py-8 gap-3">
                                <Info className="size-8" />
                                <p>No Notes found</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredNotes.map((note) => (
                                    <div key={note.id} className="flex gap-3">
                                        <Avatar className="size-8 flex-shrink-0">
                                            <AvatarImage
                                                src={note.person.avatar}
                                            />
                                            <AvatarFallback>
                                                {note.person.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm">
                                                    {note.person.name}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatTimestamp(
                                                        note.timestamp
                                                    )}
                                                </span>
                                            </div>
                                            <div className="bg-muted rounded-lg rounded-tl-none p-3 text-sm">
                                                {note.text}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <div className="p-3">
                    <div className="flex items-center gap-4">
                        <Input
                            placeholder="Add Note"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handlePostNote();
                                }
                            }}
                            className="flex-1 rounded"
                        />
                        <Button
                            size="icon"
                            variant={'outline'}
                            onClick={handlePostNote}
                            disabled={!newNote.trim()}
                            className='flex h-9 w-9'
                        >
                            <Send className="size-5 text-green-800 dark:text-white" />
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
