import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import ClientLayout from './layouts/ClientLayout'
import Dashboard from './pages/admin/Dashboard'
import ManageMovie from './pages/admin/ManageMovie'
import Home from './pages/client/Home'
import MovieDetail from './pages/client/MovieDetail'
import './App.css'
import LoginForm from './features/auth/components/LoginForm'
import RegisterForm from './features/auth/components/RegisterForm'
import AuthLayout from './layouts/AuthLayout'
import ChangePasswordForm from './features/auth/components/ChangePasswordForm'
import { ConfigProvider, App as AntdApp } from 'antd'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#e11d48',
        },
      }}
    >
      <AntdApp>
        <BrowserRouter>
          <Routes>

            <Route element={<AuthLayout />}>
              <Route path="signIn" element={<LoginForm />} />
              <Route path="signUp" element={<RegisterForm />} />
              <Route path="forgot-password" element={<ChangePasswordForm />} />
            </Route>

            <Route element={<ClientLayout />}>
              <Route index element={<Home />} />
              <Route path="movies/:id" element={<MovieDetail />} />
            </Route>

            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="movies" element={<ManageMovie />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>

        <ToastContainer position="top-center" autoClose={3000} />
      </AntdApp>
    </ConfigProvider>
  )
}
export default App