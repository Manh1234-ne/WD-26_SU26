import { type FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../auth.store'
import { googleSignIn, login } from '../services/auth.service'
import { toast } from 'react-toastify'
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
function LoginForm() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const data = await login({ email, password })
      setAuth(data.token, data.user)
      navigate(data.user.role === 'admin' ? '/admin' : '/')
      toast.success('đăng nhập thành công');
    } catch {
      setError('Đăng nhập thất bại. Kiểm tra email hoặc mật khẩu.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Đăng Nhập</p>
        <h2>Chào mừng trở lại</h2>
      </div>
      {error && <p className="state-text error-text">{error}</p>}
      <label>
        Email
        <input
          autoComplete="email"
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder='..........'
        />
      </label>
      <label>
        Mật khẩu
        <input
          autoComplete="current-password"
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder='..........'
        />
      </label>
      <div className='flex justify-center'>
        <GoogleOAuthProvider clientId="446988791872-h543v17pph0lm1rr9cknokd3aa5hf17v.apps.googleusercontent.com">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              try {
                const data = await googleSignIn({ token: credentialResponse.credential })
                setAuth(data.token, data.user)
                navigate(data.user.role === 'admin' ? '/admin' : '/')
                toast.success('đăng nhập thành công');
              } catch (error: any) {
                toast.error(error.message)
              }
            }}
            onError={() => {
              console.log('Login Failed');
            }}
          />
        </GoogleOAuthProvider>
      </div>
      <button className="primary-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Đang xử lý...' : 'Đăng nhập'}
      </button>
      <p className="auth-switch">
        chưa có tài khoản <Link to="/signUp">Đăng ký ngay</Link>
      </p>
    </form>
  )
}

export default LoginForm
