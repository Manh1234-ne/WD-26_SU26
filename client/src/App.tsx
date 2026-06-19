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
import { ConfigProvider } from 'antd'
import ManageCinema from './pages/admin/ManageCinema'
import ManageRoom from './pages/admin/ManageRoom'
import ManageSeat from './pages/admin/ManageSeat'

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#e11d48',
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          {/* Auth routes */}
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
            <Route path="cinemas" element={<ManageCinema />} />
            <Route path="rooms" element={<ManageRoom />} />
            <Route path="seats" element={<ManageSeat />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App

