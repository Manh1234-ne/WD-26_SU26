import { Navigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/auth.store";
import { toast } from "react-toastify";

export const StaffRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();

  if (!user) {
    toast.error("Bạn cần phải đăng nhập để truy cập trang nhân viên!");
    return <Navigate to="/signIn" replace />;
  }

  if (user.role !== "staff" && user.role !== "admin") {
    toast.error("Bạn không có quyền truy cập vào khu vực nhân viên!");
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default StaffRoute;
