import type {User} from "firebase/auth";
import type { UserRole } from "@/types/user";

function getUserRole(_user: User): UserRole {
    // In a real app, you would fetch the role from Firestore or a custom claim
    // For now, we'll return "user" as default
    // You can implement role-based logic based on email or custom claims
    return "user"
}

export default getUserRole;