export const getItem = <T>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        if (item === null) return defaultValue;
        return JSON.parse(item) as T;
    } catch (error) {
        console.warn(`localStorage getItem failed for key "${key}":`, error);
        return defaultValue;
    }
};

export const setItem = <T>(key: string, value: T): boolean => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn(`localStorage setItem failed for key "${key}":`, error);
        return false;
    }
};

export const removeItem = (key: string): boolean => {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.warn(`localStorage removeItem failed for key "${key}":`, error);
        return false;
    }
};

export const clear = (): boolean => {
    try {
        localStorage.clear();
        return true;
    } catch (error) {
        console.warn('localStorage clear failed:', error);
        return false;
    }
};

export const isAvailable = (): boolean => {
    try {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return true;
    } catch {
        return false;
    }
};

export const STORAGE_KEYS = {
    LANGUAGE: 'language',
    THEME: 'theme',
} as const;
