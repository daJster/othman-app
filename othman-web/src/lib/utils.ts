import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export async function fetchData<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return res.json();
}

export function fullNavigate(to: string) {
    window.location.href = to;
}

type RGB = [number, number, number];

function lerp(a: number, b: number, t: number): number {
    return Math.round(a + (b - a) * t);
}

function interpolateColor(color1: RGB, color2: RGB, t: number): string {
    const r = lerp(color1[0], color2[0], t);
    const g = lerp(color1[1], color2[1], t);
    const b = lerp(color1[2], color2[2], t);
    return `rgb(${r}, ${g}, ${b})`;
}

export function getHeatmapColor(value: number, isDark = false): string {
    if (isDark) {
        const start: RGB = [38, 38, 38];
        const end: RGB = [22, 163, 74];
        return interpolateColor(start, end, value / 100);
    }
    const start: RGB = [245, 245, 245];
    const end: RGB = [21, 128, 61];
    return interpolateColor(start, end, value / 100);
}

export function capitalizeFirst(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

const jsonCache = new Map<string, unknown>();

export async function fetchJSON<T>(url: string): Promise<T> {
    if (jsonCache.has(url)) return jsonCache.get(url) as T;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    const data: T = await res.json();
    jsonCache.set(url, data);
    return data;
}

const audioCache = new Map<string, HTMLAudioElement>();

export function fetchAudio(url: string): HTMLAudioElement {
    if (audioCache.has(url)) return audioCache.get(url)!;
    if (audioCache.size >= 10) {
        const oldestKey = audioCache.keys().next().value!;
        audioCache.delete(oldestKey);
    }
    const audio = new Audio(url);
    audioCache.set(url, audio);
    return audio;
}


interface WordToken {
    word: string;
    start: number;
    end: number;
}

export function tokenizeArabic(text: string): WordToken[] {
    const tokens: WordToken[] = [];
    const regex = /[\u0600-\u06FF]+|[^\s\u0600-\u06FF]+/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
        tokens.push({
            word: match[0],
            start: match.index,
            end: match.index + match[0].length,
        });
    }
    return tokens;
}
