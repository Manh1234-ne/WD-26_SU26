import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import ClientLayout from './layouts/ClientLayout'
import Dashboard from './pages/admin/Dashboard'
import ManageMovie from './pages/admin/ManageMovie'
import Home from './pages/client/Home'
import MovieDetail from './pages/client/MovieDetail'
import Payment from './pages/client/Payment'
import './App.css'
import LoginForm from './features/auth/components/LoginForm'
import RegisterForm from './features/auth/components/RegisterForm'
import AuthLayout from './layouts/AuthLayout'
import ChangePasswordForm from './features/auth/components/ChangePasswordForm'
import { ConfigProvider, App as AntdApp } from 'antd'

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
            {/* Auth routes */}
            <Route element={<AuthLayout />}>
              <Route path="signIn" element={<LoginForm />} />
              <Route path="signUp" element={<RegisterForm />} />
              <Route path="forgot-password" element={<ChangePasswordForm />} />
            </Route>

            <Route element={<ClientLayout />}>
              <Route index element={<Home />} />
              <Route path="movies/:id" element={<MovieDetail />} />
              <Route path="payment" element={<Payment />} />
              <Route path="payment-success" element={<Payment />} />
            </Route>

            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="movies" element={<ManageMovie />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  )
}

export default App