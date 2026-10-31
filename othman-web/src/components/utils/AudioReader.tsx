import { useState, useCallback, useEffect, useRef, useReducer } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
    PlayIcon,
    PauseIcon,
    SkipBackIcon,
    SkipForwardIcon,
} from 'lucide-react';
import { Spinner } from '../ui/spinner';
import { useDebouncedCallback } from '@/hooks/use-debounce';

export interface AudioReaderProps {
    variant?: 'ghost' | 'outline';
    autoReadEnabled?: boolean;
    onNext?: () => void;
    onPrev?: () => void;
    audioFn: () => Promise<HTMLAudioElement | null>;
}

function formatTime(seconds: number | null | undefined): string {
    if (seconds == null || isNaN(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

type AudioState = {
    isPlaying: boolean;
    isLoading: boolean;
    playbackPosition: number;
    totalDuration: number;
};

type AudioAction =
    | { type: 'RESET' }
    | { type: 'PLAYING'; payload: boolean }
    | { type: 'LOADING'; payload: boolean }
    | { type: 'TIME_UPDATE'; payload: number }
    | { type: 'METADATA_LOADED'; payload: number };

const audioReducer = (state: AudioState, action: AudioAction): AudioState => {
    switch (action.type) {
        case 'RESET':
            return {
                isPlaying: false,
                isLoading: true,
                playbackPosition: 0,
                totalDuration: 0,
            };
        case 'PLAYING':
            return { ...state, isPlaying: action.payload };
        case 'LOADING':
            return { ...state, isLoading: action.payload };
        case 'TIME_UPDATE':
            return { ...state, playbackPosition: action.payload };
        case 'METADATA_LOADED':
            return {
                ...state,
                totalDuration: action.payload,
                isLoading: false,
            };
        default:
            return state;
    }
};

export function AudioReader({
    variant = 'ghost',
    autoReadEnabled = false,
    onNext,
    onPrev,
    audioFn,
}: AudioReaderProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playbackSpeedx2, setPlaybackSpeedx2] = useState(false);

    const [
        { isPlaying, isLoading, playbackPosition, totalDuration },
        dispatch,
    ] = useReducer(audioReducer, {
        isPlaying: false,
        isLoading: true,
        playbackPosition: 0,
        totalDuration: 0,
    });

    const isGhost = variant === 'ghost';
    const containerClass = isGhost
        ? 'w-full max-w-xl mx-auto p-3 space-y-4 font-sans'
        : 'w-full max-w-xl mx-auto p-3 space-y-4 border border-neutral-300/60 bg-white dark:bg-green-950 font-sans rounded-lg shadow-lg';

    const playButtonClass = isGhost
        ? 'rounded-full size-12 hover:bg-white/10 dark:hover:bg-white/20'
        : 'rounded-full size-15 bg-white border-0 dark:bg-green-800 hover:bg-neutral-100 dark:hover:bg-green-700';

    const skipButtonClass = isGhost
        ? 'rounded-full hover:bg-white/10 dark:hover:bg-white/10'
        : 'rounded-full hover:bg-white/20 dark:hover:bg-white/10';

    const waitForAudioReady = (audio: HTMLAudioElement) => {
        return new Promise<HTMLAudioElement>((resolve, reject) => {
            if (audio.readyState >= 1) {
                resolve(audio);
                return;
            }

            const onLoadedMetadata = () => {
                cleanup();
                resolve(audio);
            };

            const onError = () => {
                cleanup();
                reject(new Error('Audio failed to load'));
            };

            const cleanup = () => {
                audio.removeEventListener('loadedmetadata', onLoadedMetadata);
                audio.removeEventListener('error', onError);
            };

            audio.addEventListener('loadedmetadata', onLoadedMetadata);
            audio.addEventListener('error', onError);
        });
    };

    useEffect(() => {
        if (!audioFn) return;

        dispatch({ type: 'RESET' });
        let cancelled = false;
        let currentAudio: HTMLAudioElement | null = null;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        timeoutId = setTimeout(() => {
            if (!cancelled) dispatch({ type: 'LOADING', payload: false });
        }, 10000);

        (async () => {
            const audio = await audioFn();
            if (!audio || cancelled) {
                if (timeoutId) clearTimeout(timeoutId);
                dispatch({ type: 'LOADING', payload: false });
                return;
            }

            try {
                await waitForAudioReady(audio);
            } catch {
                if (timeoutId) clearTimeout(timeoutId);
                if (!cancelled) dispatch({ type: 'LOADING', payload: false });
                return;
            }

            if (cancelled) return;
            if (timeoutId) clearTimeout(timeoutId);

            currentAudio = audio;
            audioRef.current = audio;
            dispatch({ type: 'METADATA_LOADED', payload: audio.duration });

            if (autoReadEnabled) {
                audio.play();
                dispatch({ type: 'PLAYING', payload: true });
            }

            const handleTimeUpdate = () =>
                dispatch({ type: 'TIME_UPDATE', payload: audio.currentTime });
            const handleLoadedMetadata = () =>
                dispatch({ type: 'METADATA_LOADED', payload: audio.duration });
            const handleCanPlay = () =>
                dispatch({ type: 'LOADING', payload: false });
            const handleWaiting = () =>
                dispatch({ type: 'LOADING', payload: true });
            const handlePlay = () =>
                dispatch({ type: 'PLAYING', payload: true });
            const handlePause = () =>
                dispatch({ type: 'PLAYING', payload: false });
            const handleEnded = () => {
                dispatch({ type: 'PLAYING', payload: false });
                if (autoReadEnabled && onNext) onNext();
            };

            audio.addEventListener('timeupdate', handleTimeUpdate);
            audio.addEventListener('loadedmetadata', handleLoadedMetadata);
            audio.addEventListener('canplay', handleCanPlay);
            audio.addEventListener('waiting', handleWaiting);
            audio.addEventListener('play', handlePlay);
            audio.addEventListener('pause', handlePause);
            audio.addEventListener('ended', handleEnded);
        })();

        return () => {
            cancelled = true;
            if (timeoutId) clearTimeout(timeoutId);
            currentAudio?.pause();
        };
    }, [audioFn]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.playbackRate = playbackSpeedx2 ? 2 : 1;
    }, [playbackSpeedx2]);

    const handleSkip = useCallback(
        (direction: 'next' | 'prev') => {
            const audio = audioRef.current;
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
            dispatch({ type: 'RESET' });
            if (direction === 'next') onNext?.();
            else onPrev?.();
        },
        [onNext, onPrev]
    );

    const togglePlay = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || isLoading) return;
        if (isPlaying) audio.pause();
        else audio.play();
    }, [isPlaying, isLoading]);

    const handleSeekDebounced = useDebouncedCallback((value: number) => {
        const audio = audioRef.current;
        if (audio) {
            audio.currentTime = value;
        }
    }, 200);

    const handleSeek = useCallback(
        (value: number) => {
            dispatch({ type: 'TIME_UPDATE', payload: value });
            handleSeekDebounced(value);
        },
        [handleSeekDebounced]
    );

    return (
        <div className={containerClass}>
            <div className="space-y-4">
                <div className="relative flex gap-4">
                    <Slider
                        value={[playbackPosition ?? 0]}
                        max={totalDuration || 100}
                        step={1}
                        onValueChange={([value]) => handleSeek(value)}
                        className="w-full"
                    />
                    <span className="absolute -bottom-2 right-14 text-[10px] font-mono text-neutral-500/50 dark:text-white/50 whitespace-nowrap">
                        {formatTime(playbackPosition)}/
                        {formatTime(totalDuration)}
                    </span>
                    <Button
                        onClick={() => setPlaybackSpeedx2(!playbackSpeedx2)}
                        className={`flex rounded-full font-semibold transition-colors size-11 border border-neutral-500/30 dark:border-white/50 ${
                            playbackSpeedx2
                                ? 'bg-white text-neutral-800 dark:bg-green-800 dark:text-white'
                                : 'bg-transparent dark:text-white hover:bg-white/10 dark:hover:bg-white/20'
                        }`}
                    >
                        <span>x2</span>
                    </Button>
                </div>

                <div className="flex items-center justify-center gap-10">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSkip('next')}
                        className={skipButtonClass}
                    >
                        <SkipBackIcon className="size-10 dark:text-white text-green-800 fill-green-800 dark:fill-white" />
                    </Button>

                    <Button
                        variant={isGhost ? 'ghost' : 'outline'}
                        size="icon"
                        onClick={togglePlay}
                        disabled={isLoading}
                        className={playButtonClass}
                    >
                        {isLoading ? (
                            <Spinner className="text-neutral-700 dark:text-white size-8" />
                        ) : isPlaying ? (
                            <PauseIcon className="size-16 dark:text-white text-neutral-800 fill-neutral-800 dark:fill-white" />
                        ) : (
                            <PlayIcon className="size-16 dark:text-white text-neutral-800 fill-neutral-800 dark:fill-white" />
                        )}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSkip('prev')}
                        className={skipButtonClass}
                    >
                        <SkipForwardIcon className="size-10 dark:text-white text-green-800 fill-green-800 dark:fill-white" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
