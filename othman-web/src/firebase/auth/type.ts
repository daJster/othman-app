import type {UserRole} from "@/types";

export interface AccountData {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: UserRole | null;
    // Add your custom Firestore profile fields here:
    // role?: "admin" | "user";
    // createdAt?: string;
    // preferences?: Record<string, unknown>;
}