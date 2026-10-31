import { fetchAccountData } from "@/firebase/auth";
import type { AccountData } from "@/firebase/auth/type";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { AccountContext } from "./contexts/auth-context";
import { auth } from "@/firebase";

interface AccountProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AccountProviderProps> = ({ children }) => {
    const [account, setAccount] = useState<AccountData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        // onAuthStateChanged fires once immediately with the current user,
        // then again on every sign-in / sign-out.
        const unsubscribe = onAuthStateChanged(
            auth,
            async (firebaseUser) => {
                setError(null);

                if (!firebaseUser) {
                    setAccount(null);
                    setLoading(false);
                    return;
                }

                try {
                    // Extend auth data with your Firestore profile fields
                    const data = await fetchAccountData(firebaseUser);
                    setAccount(data);
                } catch (err) {
                    console.error(
                        '[AccountProvider] Failed to fetch account data:',
                        err
                    );
                    setError(
                        err instanceof Error ? err : new Error(String(err))
                    );
                    setAccount(null); // account is null on failure
                } finally {
                    setLoading(false);
                }
            },
            (err) => {
                // Auth observer itself errored (e.g. network issue)
                console.error('[AccountProvider] Auth observer error:', err);
                setError(err);
                setAccount(null);
                setLoading(false);
            }
        );

        return unsubscribe; // Cleans up the listener on unmount
    }, []);

    return (
        <AccountContext.Provider value={{ account, loading, error }}>
            {children}
        </AccountContext.Provider>
    );
};