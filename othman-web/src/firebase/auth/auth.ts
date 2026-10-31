import {createUserWithEmailAndPassword, signInWithEmailAndPassword} from "firebase/auth";
import {auth, db} from "@/firebase";
import type {
    User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import type {AccountData} from "@/firebase/auth/type.ts";
import {signOut as firebaseSignOut} from "@firebase/auth";

export const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
}

export const register = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password)
}

export const logout = async () => {
    await firebaseSignOut(auth)
}
// facebook auth handler
// https://othman-kuttab.firebaseapp.com/__/auth/handler

// ─── Custom Firebase Logic ────────────────────────────────────────────────────
// Add your custom Firebase helper functions here.
// They receive `auth` / `db` from above and are imported wherever needed.

/**
 * Fetches the user's Firestore profile document.
 * Returns null if the document doesn't exist yet.
 */
export async function fetchAccountData(
    firebaseUser: FirebaseUser
): Promise<AccountData> {
    const ref = doc(db, "users", firebaseUser.uid)
    const snap = await getDoc(ref)

    const firestoreData = snap.exists() ? snap.data() : {}

    return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        ...firestoreData,
    } as AccountData
}