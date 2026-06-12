
import { useAuthStore } from "../auth.store"

export const useAuth = () => {
    const { setAuth, clearAuth, isAuthenticated, token, user } = useAuthStore();

    return {
        setAuth,
        clearAuth,
        isAuthenticated,
        token,
        user
    }
}