import { Navigate } from "react-router-dom"
import { useAuthStore } from "../features/auth/auth.store"
import { toast } from "react-toastify"


export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuthStore()

    if (!user) {
        toast.error("Bạn cần phải đăng nhập");
        return <Navigate to={'/signIn'} />
    }
    if (user!.role !== "admin") {
        toast.error("Bạn không có quyền truy cập!")
        return <Navigate to={'/'} />
    }
    return children

}
