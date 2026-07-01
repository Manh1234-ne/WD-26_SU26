import { useAuthStore } from "../features/auth/auth.store"
import { Navigate } from "react-router-dom"
interface AuthGuardProps {
    children: React.ReactNode
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
    const { token } = useAuthStore();

    if (!token) {
        return <Navigate to="/signIn" />
    }

    return children;
}