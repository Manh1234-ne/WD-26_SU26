import { useEffect, useState } from 'react'
import type { AuthResponse } from '../../features/auth/auth.types'
import { useParams } from 'react-router-dom';
import { getProfile } from '../../features/auth/services/auth.service';
import './Profile.css';
import Loading from '../../components/Loading/Loading';

function Profile() {
    const [profile, setProfile] = useState<AuthResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { id } = useParams();

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
    }, [id])

    const formatDate = (dateStr?: string | Date) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    const roleLabel = (role?: string) => {
        const map: Record<string, string> = { admin: 'Quản trị viên', staff: 'Nhân viên', customer: 'Khách hàng' };
        return role ? (map[role] ?? role) : '';
    };

    const initials = (name?: string) =>
        name ? name.trim().split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() : '?';

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
                                    <label htmlFor="text">Ngày sinh</label>
                                    <input type="text" value={formatDate(profile.user.dateOfBirth) || "chưa cập nhật"} readOnly />
                                </div>
                                <div className="profile-info-item full-width">
                                    <label htmlFor="text">Địa chỉ</label>
                                    <input type="text" value={profile.user.address || "chưa cập nhật"} readOnly />
                                </div>

                            </div>

                            <button className="profile-edit-btn">
                                Chỉnh sửa thông tin
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </section>
    )
}

export default Profile
