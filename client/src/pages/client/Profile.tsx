import { useEffect, useState } from 'react'
import type { AuthResponse, AuthUser } from '../../features/auth/auth.types'
import { useParams } from 'react-router-dom';
import { getProfile, changePassword, updateProfile } from '../../features/auth/services/auth.service';
import './Profile.css';
import Loading from '../../components/Loading/Loading';
import { Button, DatePicker, Form, Input, Modal } from 'antd';
import dayjs from 'dayjs';
import { getBookingsByUser } from '../../features/booking/booking.service';
import { CopyFilled, DollarOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom';
function Profile() {
    const [profile, setProfile] = useState<AuthResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { id } = useParams();
    // state  cho việc thay đổi mật khẩu
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    //update profile
    const [editing, setEditing] = useState(false);

    const [form] = Form.useForm<AuthUser | null>();
    const handleUpdate = async (values: any) => {
        if (!id) return;

        try {
            const data = await updateProfile(id, values);

            setProfile(data);

            setEditing(false);

            form.resetFields();
        } catch (error) {
            setError("Cập nhật thất bại");
        }
    };

    const handleEdit = () => {
        if (!profile) return;

        form.setFieldsValue({
            fullName: profile.user.fullName,
            phone: profile.user.phone,
            address: profile.user.address,
            dateOfBirth: profile.user.dateOfBirth ? dayjs(profile.user.dateOfBirth) : undefined,
        });

        setEditing(true);
    };


    useEffect(() => {
        const getProfileUser = async () => {
            try {
                if (id) {
                    const data = await getProfile(id);
                    setProfile(data);
                }
            } catch (error) {
                setError("Không thể kết nối với server")
            } finally {
                setLoading(false);
            }
        }
        getProfileUser();
    }, [id]);

    //Tổng số vé và người dùng đã đặt
    const [totalBookings, setTotalBookings] = useState<number>(0);
    const [totalSpent, setTotalSpent] = useState<number>(0);

    useEffect(() => {
        if (!id) {
            return;
        }
        const loadBookingCount = async () => {
            try {
                const res = await getBookingsByUser(id);
                const booking = res.data;

                const bookingSuccess = booking.filter(
                    (booking) => booking.status === "completed"
                )
                setTotalBookings(bookingSuccess.length);
                setTotalSpent(
                    bookingSuccess.reduce((sum, booking) => sum + (booking.finalAmount || 0), 0)
                );
            } catch (error) {
                setError("lỗi lấy thông tin")
            } finally {
                setLoading(false);
            }

        }
        loadBookingCount();
    }, [id]);

    const formatDate = (dateStr?: dayjs.Dayjs | string | Date | null) => {
        if (!dateStr) return null;
        return dayjs(dateStr).format('DD/MM/YYYY');
    };

    const roleLabel = (role?: string) => {
        const map: Record<string, string> = { admin: 'Quản trị viên', staff: 'Nhân viên', customer: 'Khách hàng' };
        return role ? (map[role] ?? role) : '';
    };

    const initials = (name?: string) =>
        name ? name.trim().split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() : '?';

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('vi-VN') + ' đ';
    };
    const openPasswordModal = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
        setPasswordSuccess('');
        setShowPasswordModal(true);
    };

    const closePasswordModal = () => {
        setShowPasswordModal(false);
    };

    const handleChangePassword = async () => {
        setPasswordError('');
        setPasswordSuccess('');

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError('Vui lòng nhập đầy đủ thông tin');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('Mật khẩu xác nhận không khớp');
            return;
        }
        if (currentPassword === newPassword) {
            setPasswordError('Mật khẩu mới không được trùng mật khẩu cũ');
            return;
        }

        try {
            setPasswordLoading(true);
            await changePassword({ currentPassword, newPassword, confirmPassword });
            setPasswordSuccess('Đổi mật khẩu thành công!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => closePasswordModal(), 1500);
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Đổi mật khẩu thất bại';
            setPasswordError(msg);
        } finally {
            setPasswordLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="profile-loading">
                <div className="profile-skeleton">
                    <div className="skeleton-banner" />
                    <div className="skeleton-body">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className={`skeleton-item${i === 4 ? ' full-width' : ''}`} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <section className="profile-section">
            {loading && <Loading text="Đang tải..." />}
            {error && <p className="state-text error-text">{error}</p>}
            {!loading && !error && !profile && (
                <p className="state-text">Không tìm thấy</p>
            )}
            {!loading && profile && (

                <div className="profile-container">
                    <div className='title'>
                        <h2>Thông tin cá nhân</h2>
                    </div>

                    <div className="profile-wrapper">
                        <div className='profile-avatar'>
                            <div className="profile-avatar-img">
                                {profile.user.avatar
                                    ? <img src={profile.user.avatar} alt={profile.user.fullName} />
                                    : initials(profile.user.fullName)
                                }
                            </div>
                        </div>
                        <div className="profile-body">

                            <div className="profile-info">
                                <div className="profile-info-item">
                                    <label htmlFor="text">Họ và tên</label>
                                    <input type="text" value={profile.user.fullName || "chưa cập nhật"} readOnly />
                                </div>
                                <div className="profile-info-item">
                                    <label htmlFor="text">Số điện thoại</label>
                                    <input type="text" value={profile.user.phone || "chưa cập nhật"} readOnly />
                                </div>
                                <div className="profile-info-item">
                                    <label htmlFor="text">Email</label>
                                    <input type="text" value={profile.user.email || "chưa cập nhật"} readOnly />
                                </div>

                                <div className="profile-info-item">
                                    <label htmlFor="text">Vai trò</label>
                                    <input type="text" value={roleLabel(profile.user.role) || "chưa cập nhật"} readOnly />
                                </div>
                                <div className="profile-info-item">
                                    <label htmlFor="text">Ngày sinh</label>
                                    <input type="text" value={formatDate(profile.user.dateOfBirth) || "chưa cập nhật"} readOnly />
                                </div>
                                <div className="profile-info-item">
                                    <label htmlFor="text">Địa chỉ</label>
                                    <input type="text" value={profile.user.address || "chưa cập nhật"} readOnly />
                                </div>
                                <div className="profile-stats">
                                    <Link to="/booking-history" >
                                        <div className="stat-card">
                                            <span className="stat-icon">
                                                <CopyFilled />
                                            </span>

                                            <div className="stat-content">
                                                <span className="stat-value">{formatCurrency(totalSpent)}</span>
                                                <span className="stat-label">Tổng chi tiêu</span>
                                            </div>

                                        </div>
                                    </Link>

                                    <div className="stat-card">
                                        <span className="stat-icon">
                                            <DollarOutlined />
                                        </span>
                                        <div className="stat-content">
                                            <span className="stat-value">{formatCurrency(totalSpent)}</span>
                                            <span className="stat-label">Tổng chi tiêu</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className='profile-btn'>
                                <button
                                    type="button"
                                    className="profile-edit-btn"
                                    onClick={handleEdit}
                                >
                                    Chỉnh sửa thông tin
                                </button>
                                <button type="button" className="change-password-btn" onClick={openPasswordModal}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                    Đổi mật khẩu
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}
            {/* form change password */}
            {showPasswordModal && (
                <Modal
                    title="Đổi mật khẩu"
                    open={showPasswordModal}
                    onCancel={closePasswordModal}
                    footer={null}
                    destroyOnClose
                    className="profile-modal"
                >
                    <Form
                        layout="vertical"
                        onFinish={handleChangePassword}
                    >
                        {passwordError && (
                            <div className="pw-alert pw-alert-error" style={{ marginBottom: 16 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                {passwordError}
                            </div>
                        )}
                        {passwordSuccess && (
                            <div className="pw-alert pw-alert-success" style={{ marginBottom: 16 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                {passwordSuccess}
                            </div>
                        )}

                        <Form.Item
                            label="Mật khẩu hiện tại"
                            required
                        >
                            <Input.Password
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Nhập mật khẩu hiện tại"
                                autoComplete="current-password"
                            />
                        </Form.Item>

                        <Form.Item
                            label="Mật khẩu mới"
                            required
                        >
                            <Input.Password
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                                autoComplete="new-password"
                            />
                        </Form.Item>

                        <Form.Item
                            label="Xác nhận mật khẩu mới"
                            required
                        >
                            <Input.Password
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Nhập lại mật khẩu mới"
                                autoComplete="new-password"
                            />
                        </Form.Item>

                        <div className="profile-modal-actions">
                            <Button type="default" onClick={closePasswordModal} className="profile-btn-cancel">
                                Hủy
                            </Button>
                            <Button type="primary" htmlType="submit" loading={passwordLoading} className="profile-btn-submit">
                                Xác nhận đổi mật khẩu
                            </Button>
                        </div>
                    </Form>
                </Modal>
            )}

            {/* form update */}
            {editing && (
                <Modal
                    title="Cập nhật thông tin"
                    open={editing}
                    onCancel={() => {
                        setEditing(false);
                        form.resetFields();
                    }}
                    footer={null}
                    destroyOnClose
                    className="profile-modal"
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleUpdate}
                    >
                        <Form.Item
                            label="Họ tên"
                            name="fullName"
                            rules={[
                                { required: true, message: "vui lòng nhập đầy đủ họ tên" }
                            ]}
                        >
                            <Input placeholder="Nhập họ và tên" />
                        </Form.Item>

                        <Form.Item
                            label="Số điện thoại"
                            name="phone"
                            rules={[
                                { required: true, message: "vui lòng nhập SĐT" }
                            ]}
                        >
                            <Input placeholder="Nhập số điện thoại" />
                        </Form.Item>

                        <Form.Item
                            label="Địa chỉ"
                            name="address"
                        >
                            <Input placeholder="Nhập địa chỉ" />
                        </Form.Item>

                        <Form.Item
                            label="Ngày sinh"
                            name="dateOfBirth"
                        >
                            <DatePicker
                                style={{ width: "100%" }}
                                placeholder="Chọn ngày sinh"
                                format="DD/MM/YYYY"
                            />
                        </Form.Item>

                        <div className="profile-modal-actions">
                            <Button type="default" onClick={() => {
                                setEditing(false);
                                form.resetFields();
                            }} className="profile-btn-cancel">
                                Hủy
                            </Button>
                            <Button type="primary" htmlType="submit" className="profile-btn-submit">
                                Cập nhật
                            </Button>
                        </div>
                    </Form>
                </Modal>
            )}
        </section >
    )
}

export default Profile
