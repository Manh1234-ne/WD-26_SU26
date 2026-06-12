import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../services/auth.service'
import type { RegisterPayload } from '../auth.types'

function RegisterForm() {
    const navigate = useNavigate()
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setError('Mật khẩu không khớp')
            return
        }
        setIsSubmitting(true)
        setError('')
        try {
            const payload: RegisterPayload = { email, password, fullName, phone }
            await register(payload)
            navigate('/signIn')
        } catch {
            setError('Đăng ký thất bại. Vui lòng thử lại.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form className="auth-form" onSubmit={handleSubmit}>
            <div>
                <p className="eyebrow">Đăng ký</p>
                <h2>Chào mừng bạn mới</h2>
            </div>
            {error && <p className="state-text error-text">{error}</p>}
            <label>
                Họ và tên
                <input
                    autoComplete="name"
                    required
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                />
            </label>
            <label>
                Email
                <input
                    autoComplete="email"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </label>
            <label>
                Số điện thoại
                <input
                    autoComplete="tel"
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
            </label>
            <label>
                Mật khẩu
                <input
                    autoComplete="new-password"
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </label>
            <label>
                Nhập lại mật khẩu
                <input
                    autoComplete="new-password"
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />
            </label>
            <button className="primary-button" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Đang xử lý...' : 'Đăng ký'}
            </button>
            <p className="auth-switch">
                Đã có tài khoản? <Link to="/signIn">Đăng nhập ngay</Link>
            </p>
        </form>
    )
}

export default RegisterForm
