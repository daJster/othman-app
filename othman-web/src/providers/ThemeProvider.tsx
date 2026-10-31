import { useState, useEffect, type ReactNode } from 'react';
import { ThemeContext, type Theme } from './contexts/theme-context.ts';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/localStorage.ts';

interface ThemeProviderProps {
    children: ReactNode;
}

const getInitialTheme = (): Theme => {
    const stored = getItem<Theme | ''>(STORAGE_KEYS.THEME, '');
    return stored || 'dark';
};

const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    if (theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        setItem(STORAGE_KEYS.THEME, newTheme);
        applyTheme(newTheme);
    };

    useEffect(() => {
        applyTheme(theme);
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
