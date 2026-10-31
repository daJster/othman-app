import { db } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const checkAccountExists = async (email: string): Promise<boolean> => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()));

    const snapshot = await getDocs(q);
    return !snapshot.empty;
};
