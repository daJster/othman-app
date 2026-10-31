import { createContext } from 'react';
import type { AccountData } from '@/firebase/auth/type.ts';

export interface AuthContextValue {
    account: AccountData | null;
    loading: boolean;
    error: Error | null;
}

export const AccountContext = createContext<AuthContextValue | null>(null);