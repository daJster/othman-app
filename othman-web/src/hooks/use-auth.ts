import { AccountContext, type AuthContextValue } from "@/providers/contexts";
import { useContext } from "react";

/**
 * Access the current account anywhere inside <AccountProvider>.
 *
 * @example
 * const { account, loading, error } = useAccount();
 */
export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AccountContext);
    if (!ctx) {
        throw new Error('useAccount must be used within an <AuthProvider>');
    }
    return ctx;
}