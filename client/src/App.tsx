import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ConfigProvider, App as AntdApp } from "antd";

import "./App.css";
import "react-toastify/dist/ReactToastify.css";

import AdminLayout from "./layouts/AdminLayout";
import ClientLayout from "./layouts/ClientLayout";
import AuthLayout from "./layouts/AuthLayout";

import Dashboard from "./pages/admin/Dashboard";
import ManageMovie from "./pages/admin/ManageMovie";
import ManageCinema from "./pages/admin/ManageCinema";
import ManageRoom from "./pages/admin/ManageRoom";
import ManageSeat from "./pages/admin/ManageSeat";
import ManageBooking from "./pages/admin/ManageBooking";
import ManageUser from "./pages/admin/ManageUser";

import Home from "./pages/client/Home";
import MovieDetail from "./pages/client/MovieDetail";

import LoginForm from "./features/auth/components/LoginForm";
import RegisterForm from "./features/auth/components/RegisterForm";
import ChangePasswordForm from "./features/auth/components/ChangePasswordForm";

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#e11d48",
        },
      }}
    >
      <AntdApp>
        <BrowserRouter>
          <Routes>
            {/* Auth */}
            <Route element={<AuthLayout />}>
              <Route path="signIn" element={<LoginForm />} />
              <Route path="signUp" element={<RegisterForm />} />
              <Route
                path="forgot-password"
                element={<ChangePasswordForm />}
              />
            </Route>

            {/* Client */}
            <Route element={<ClientLayout />}>
              <Route index element={<Home />} />
              <Route path="movies/:id" element={<MovieDetail />} />
            </Route>

            {/* Admin */}
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="movies" element={<ManageMovie />} />
              <Route path="cinemas" element={<ManageCinema />} />
              <Route path="rooms" element={<ManageRoom />} />
              <Route path="seats" element={<ManageSeat />} />
              <Route path="bookings" element={<ManageBooking />} />
              <Route path="users" element={<ManageUser />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;