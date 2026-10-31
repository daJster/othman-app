import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import {
    BookOpen,
    ExternalLink,
    type LucideProps,
    CheckCircle2,
    Trash2,
    FileText,
    Megaphone,
    ChartLine,
    Video,
    University,
    Cog,
} from 'lucide-react';

export const CDN_BASE_URL = 'https://cdn.kuttab-othman.workers.dev';
export const ALQURAN_API_BASE_URL = 'https://api.alquran.cloud';
export const ALQURAN_CDN_BASE_URL = 'https://cdn.islamic.network';
export const QURAN_METADATA_URL = `${CDN_BASE_URL}/quran.json`;
export const QURANPEDIA_BASE_URL = 'https://api.quranpedia.net';
export const MAX_ABSOLUTE_AYAH_NUMBER = 6236;
export const isAyahNumberValid = (n: number) =>
    n >= 1 && n <= MAX_ABSOLUTE_AYAH_NUMBER;
export const AUDIO_QUALITIES = [192, 128, 64, 48, 40, 3];

export type NavItemVariant = 'default' | 'destructive';

export interface NavItem {
    title: string;
    href?: string;
    Icon?: ForwardRefExoticComponent<
        Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
    >;
    description?: string;
    children?: NavItem[];
    badge?: string;
    variant?: NavItemVariant;
}

export interface NavConfig {
    guest: NavItem[];
    admin: NavItem[];
    superadmin: NavItem[];
}

export const createDefaultNavConfig: () => NavConfig = () => {
    return {
        guest: [
            {
                title: 'ٱلْقُرْآنُ ٱلْكَرِيمُ',
                href: '/quran',
                description: 'nav.quranDesc',
                Icon: BookOpen
            },
        ],
        admin: [
            {
                title: 'nav.admin',
                children: [
                    {
                        title: 'nav.dashboard',
                        href: '/admin/dashboard',
                        description: 'nav.dashboardDesc',
                    },
                    {
                        title: 'nav.users',
                        href: '/admin/users',
                        description: 'nav.usersDesc',
                    },
                    {
                        title: 'nav.content',
                        href: '/admin/content',
                        description: 'nav.contentDesc',
                    },
                ],
            },
        ],
        superadmin: [
            {
                title: 'nav.superAdmin',
                children: [
                    {
                        title: 'nav.settings',
                        href: '/superadmin/settings',
                        description: 'nav.settingsDesc',
                    },
                    {
                        title: 'nav.analytics',
                        href: '/superadmin/analytics',
                        description: 'nav.analyticsDesc',
                    },
                ],
            },
        ],
    };
};

export const createPhoneExtensionList = () => {
    return [
        {
            name: 'France',
            iso: 'FR',
            dialCode: '+33',
            flag: '🇫🇷',
        },
        {
            name: 'Morocco',
            iso: 'MA',
            dialCode: '+212',
            flag: '🇲🇦',
        },
    ];
};

export const createMeetingStatusConfig = () => {
    return {
        soon: {
            label: 'Starting soon',
            classes:
                'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
            dot: 'bg-emerald-500 animate-pulse',
        },
        upcoming: {
            label: 'Today',
            classes:
                'bg-blue-100 text-blue-700 dark:bg-neutral-950 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800',
            dot: 'bg-blue-500',
        },
        scheduled: {
            label: 'Scheduled',
            classes:
                'bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400 border-slate-200 dark:border-neutral-700',
            dot: 'bg-slate-400',
        },
    };
};

export const createAttendeeListConfig = () => {
    return {
        maxVisible: 4,
        avatarSize: 'h-6 w-6',
        avatarBorder: 'border-2 border-white dark:border-neutral-900',
        avatarRing: 'ring-0 cursor-default',
        fallbackClass:
            'text-[9px] font-semibold bg-slate-200 dark:bg-neutral-700 text-neutral-600 dark:text-slate-300',
        extraCountClass:
            'flex h-6 w-6 items-center justify-center rounded-full border-2 border-white dark:border-neutral-900 bg-slate-100 dark:bg-neutral-700 text-[9px] font-semibold text-slate-500 dark:text-slate-400',
    };
};

export const createAccountSettingsNavConfig: () => NavItem[][] = () => {
    return [
        [
            {
                title: 'Meetings',
                href: '/my-meetings',
                Icon: Video,
            },
            {
                title: 'Classroom',
                href: '/my-classroom',
                Icon: University,
            },
            {
                title: 'Tasks',
                href: '/tasks',
                Icon: CheckCircle2,
            },
            {
                title: 'Progress',
                href: '/account/progress',
                Icon: ChartLine,
            },
        ],
        [
            {
                title: 'Notifications',
                href: '/account/notifications',
                Icon: Megaphone,
            },
            {
                title: 'About',
                href: '/account/settings/about',
                Icon: BookOpen,
            },
            {
                title: 'Terms & Conditions',
                href: '/t&c',
                Icon: FileText,
            },
            {
                title: 'Third-Party Services',
                href: '/account/settings/third-party-services',
                Icon: ExternalLink,
            },
        ],
        [
            {
                title: 'Set Preferences',
                href: '/account',
                Icon: Cog,
            },
        ],
        [
            {
                title: 'delete account',
                href: '/account/settings/delete',
                Icon: Trash2,
                variant: 'destructive',
            },
        ],
    ];
};

export interface Shaykh {
    name: string;
    englishName: string;
    language: 'ar' | 'en' | 'fr';
    format: 'audio';
    type: 'translation' | 'versebyverse';
    identifier: string;
    direction: string | null;
    url_path: string;
}

export const createShaykhListConfig = (): {
    defaultReader: Shaykh;
    readers: Shaykh[];
} => {
    return {
        defaultReader: {
            identifier: 'ar.husarymujawwad',
            language: 'ar',
            name: 'محمد خليل الحصري (المجود)',
            englishName: 'Husary (Mujawwad)',
            format: 'audio',
            type: 'versebyverse',
            direction: null,
            url_path: '/quran/audio/128/ar.husarymujawwad/'
        },
        readers: [
            {
                identifier: 'ar.husarymujawwad',
                language: 'ar',
                name: 'محمد خليل الحصري (المجود)',
                englishName: 'Husary (Mujawwad)',
                format: 'audio',
                type: 'versebyverse',
                direction: null,
                url_path: '/quran/audio/128/ar.husarymujawwad/'
            },
            {
                identifier: 'ar.abdulbasitmurattal',
                language: 'ar',
                name: 'عبد الباسط عبد الصمد المرتل',
                englishName: 'Abdul Basit',
                format: 'audio',
                type: 'translation',
                direction: null,
                url_path: '/quran/audio/192/ar.abdulbasitmurattal/'
            },
            {
                identifier: 'ar.abdullahbasfar',
                language: 'ar',
                name: 'عبدالله بصفر',
                englishName: 'Abdullah Basfar',
                format: 'audio',
                type: 'versebyverse',
                direction: null,
                url_path: '/quran/audio/192/ar.abdullahbasfar/'
            },
            {
                identifier: 'ar.abdurrahmaansudais',
                language: 'ar',
                name: 'عبد الرحمن السديس',
                englishName: 'Abdurrahmaan As-Sudais',
                format: 'audio',
                type: 'versebyverse',
                direction: null,
                url_path: '/quran/audio/192/ar.abdurrahmaansudais/'
            },
            {
                identifier: 'ar.abdulsamad',
                language: 'ar',
                name: 'عبدالباسط عبد الصمد',
                englishName: 'Abdul Samad',
                format: 'audio',
                type: 'versebyverse',
                direction: null,
                url_path: '/quran/audio/64/ar.abdulsamad/'
            },
            {
                identifier: 'ar.shaatree',
                language: 'ar',
                name: 'أبو بكر الشاطري',
                englishName: 'Abu Bakr Ash-Shaatree',
                format: 'audio',
                type: 'versebyverse',
                direction: null,
                url_path: '/quran/audio/128/ar.shaatree/'
            },
            {
                identifier: 'ar.alafasy',
                language: 'ar',
                name: 'مشاري العفاسي',
                englishName: 'Alafasy',
                format: 'audio',
                type: 'versebyverse',
                direction: null,
                url_path: '/quran/audio/128/ar.alafasy/'
            },
            {
                identifier: 'ar.hudhaify',
                language: 'ar',
                name: 'علي بن عبد الرحمن الحذيفي',
                englishName: 'Hudhaify',
                format: 'audio',
                type: 'versebyverse',
                direction: null,
                url_path: '/quran/audio/128/ar.hudhaify/'
            },
            {
                identifier: 'ar.mahermuaiqly',
                language: 'ar',
                name: 'ماهر المعيقلي',
                englishName: 'Maher Al Muaiqly',
                format: 'audio',
                type: 'versebyverse',
                direction: null,
                url_path: '/quran/audio/128/ar.mahermuaiqly/'
            },
            {
                identifier: 'ar.minshawi',
                language: 'ar',
                name: 'محمد صديق المنشاوي',
                englishName: 'Minshawi',
                format: 'audio',
                type: 'translation',
                direction: null,
                url_path: '/quran/audio/128/ar.minshawi/'
            },
            {
                identifier: 'ar.minshawimujawwad',
                language: 'ar',
                name: 'محمد صديق المنشاوي (المجود)',
                englishName: 'Minshawy (Mujawwad)',
                format: 'audio',
                type: 'translation',
                direction: null,
                url_path: '/quran/audio/64/ar.minshawimujawwad/'
            },
            {
                identifier: 'ar.muhammadayyoub',
                language: 'ar',
                name: 'محمد أيوب',
                englishName: 'Muhammad Ayyoub',
                format: 'audio',
                type: 'versebyverse',
                direction: null,
                url_path: '/quran/audio/128/ar.muhammadayyoub/'
            },
            {
                identifier: 'ar.muhammadjibreel',
                language: 'ar',
                name: 'محمد جبريل',
                englishName: 'Muhammad Jibreel',
                format: 'audio',
                type: 'versebyverse',
                direction: null,
                url_path: '/quran/audio/128/ar.muhammadjibreel/'
            },
            {
                identifier: 'fr.leclerc',
                language: 'fr',
                name: 'Youssouf Leclerc',
                englishName: 'Youssouf Leclerc',
                format: 'audio',
                type: 'versebyverse',
                direction: null,
                url_path: '/quran/audio/128/fr.leclerc/'
            },
        ],
    };
};

export type PageSize = {
    height: number;
    width: number;
};

export type PageScale = {
    scaleX: number;
    scaleY: number;
    offsetX: number;
    offsetY: number;
};

export type EditionPageConfig = {
    size: PageSize;
    pages: {
        [pageKey: string]: PageScale;
    };
};

export const createQuranPageScaleConfig: () => {
    [edition: string]: EditionPageConfig;
} = () => {
    return {
        Tajweed: {
            size: {
                height: 600,
                width: 412,
            },
            pages: {
                '1': {
                    scaleX: 0.9,
                    scaleY: 0.88,
                    offsetX: -5,
                    offsetY: -20,
                },
                '2': {
                    scaleX: 0.9,
                    scaleY: 0.88,
                    offsetX: -5,
                    offsetY: -20,
                },
                default: {
                    scaleX: 0.85,
                    scaleY: 0.897,
                    offsetX: -5,
                    offsetY: 0,
                },
            },
        },
        MedinaOld: {
            size: {
                height: 600,
                width: 412,
            },
            pages: {
                '4': {
                    scaleX: 0.95,
                    scaleY: 0.92,
                    offsetX: -10,
                    offsetY: -8,
                },
                '5': {
                    scaleX: 0.95,
                    scaleY: 0.92,
                    offsetX: -18,
                    offsetY: -8,
                },
                default: {
                    scaleX: 0.93,
                    scaleY: 0.9,
                    offsetX: -8,
                    offsetY: -2,
                },
            },
        },
        Warsh1: {
            size: {
                height: 600,
                width: 412,
            },
            pages: {
                '4': {
                    scaleX: 0.9,
                    scaleY: 0.85,
                    offsetX: -3,
                    offsetY: 16,
                },
                '5': {
                    scaleX: 0.83,
                    scaleY: 0.858,
                    offsetX: 10,
                    offsetY: 16,
                },
                default: {
                    scaleX: 0.865,
                    scaleY: 0.89,
                    offsetX: -2,
                    offsetY: 2,
                },
            },
        },
    };
};
