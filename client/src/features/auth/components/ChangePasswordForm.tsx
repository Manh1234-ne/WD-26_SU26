import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import type { ChangePassword } from '../auth.types'
import { changePassword } from '../services/auth.service'
import { toast } from 'react-toastify'
import { useAuthStore } from '../auth.store'

function ChangePasswordForm() {
    const nav = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showCurrent, setShowCurrent] = useState(false)
    const [showNew, setShowNew] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const {
        register,
        watch,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<ChangePassword>()

    const newPassword = watch('newPassword');
    const email = useAuthStore((state) => state.user?.email);
    if (!email) {

    }

    const onSubmit = async (data: ChangePassword) => {
        try {
            setIsSubmitting(true)
            await changePassword(data)
            toast.success('Đổi mật khẩu thành công')
            reset()
            nav('/signIn')
        } catch {
            toast.error('Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
            <div>
                <p className="eyebrow">Tài khoản</p>
                <h2>Đổi mật khẩu</h2>
            </div>
            <label>
                Mật khẩu hiện tại
                <div style={{ position: 'relative' }}>
                    <input
                        type={showCurrent ? 'text' : 'password'}
                        autoComplete="current-password"
                        {...register('currentPassword', {
                            required: 'Vui lòng nhập mật khẩu hiện tại',
                            minLength: { value: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
                        })}
                    />
                    <button
                        type="button"
                        onClick={() => setShowCurrent(v => !v)}
                        style={{
                            position: 'absolute', right: 12, top: '50%',
                            transform: 'translateY(-50%)', background: 'none',
                            border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13
                        }}
                    >
                        {showCurrent ? 'Ẩn' : 'Hiện'}
                    </button>
                </div>
                {errors.currentPassword && (
                    <p className="state-text error-text">{errors.currentPassword.message}</p>
                )}
            </label>
            <label>
                Mật khẩu mới
                <div style={{ position: 'relative' }}>
                    <input
                        type={showNew ? 'text' : 'password'}
                        autoComplete="new-password"
                        {...register('newPassword', {
                            required: 'Vui lòng nhập mật khẩu mới',
                            minLength: { value: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
                        })}
                    />
                    <button
                        type="button"
                        onClick={() => setShowNew(v => !v)}
                        style={{
                            position: 'absolute', right: 12, top: '50%',
                            transform: 'translateY(-50%)', background: 'none',
                            border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13
                        }}
                    >
                        {showNew ? 'Ẩn' : 'Hiện'}
                    </button>
                </div>
                {errors.newPassword && (
                    <p className="state-text error-text">{errors.newPassword.message}</p>
                )}
            </label>
            <label>
                Xác nhận mật khẩu mới
                <div style={{ position: 'relative' }}>
                    <input
                        type={showConfirm ? 'text' : 'password'}
                        autoComplete="new-password"
                        {...register('confirmPassword', {
                            required: 'Vui lòng xác nhận mật khẩu mới',
                            validate: (value) =>
                                value === newPassword || 'Xác nhận mật khẩu không khớp'
                        })}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirm(v => !v)}
                        style={{
                            position: 'absolute', right: 12, top: '50%',
                            transform: 'translateY(-50%)', background: 'none',
                            border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13
                        }}
                    >
                        {showConfirm ? 'Ẩn' : 'Hiện'}
                    </button>
                </div>
                {errors.confirmPassword && (
                    <p className="state-text error-text">{errors.confirmPassword.message}</p>
                )}
            </label>

            <button className="primary-button" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </button>
        </form>
    )
}

export default ChangePasswordForm
