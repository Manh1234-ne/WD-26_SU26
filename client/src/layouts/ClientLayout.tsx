import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  HomeOutlined, VideoCameraOutlined, EnvironmentOutlined, PhoneOutlined,
  ShoppingCartOutlined, BgColorsOutlined, UserOutlined, HistoryOutlined,
  LogoutOutlined, DashboardOutlined, FacebookOutlined, TwitterOutlined,
  InstagramOutlined, YoutubeOutlined, InfoCircleOutlined, TeamOutlined,
  MailOutlined, FileTextOutlined, SafetyCertificateOutlined,
  QuestionCircleOutlined, BookOutlined, MoneyCollectOutlined,
  CrownOutlined, GiftOutlined
} from '@ant-design/icons'
import { useAuth } from '../features/auth/hooks/useAuth'
import { Button, Dropdown, Avatar, Space, Typography, Row, Col, Divider, Input } from 'antd'
import { logout } from '../features/auth/services/auth.service'
import Swal from "sweetalert2"

const { Text } = Typography;

function ClientLayout() {
  const styles = {
    shell: {
      minHeight: '100vh',
      background: '#fff',
    },
    header: {
      background: '#fff',
      padding: '12px 40px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      borderBottom: '1px solid #f0f0f0',
    },
    brand: {
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: '#e11d48',
      fontWeight: 700,
      fontSize: '20px',
      cursor: 'pointer',
      marginRight: '60px',
    },
    brandIcon: {
      fontSize: '24px',
    },
    navCenter: {
      display: 'flex',
      gap: '40px',
      alignItems: 'center',
      flex: 1,
    },
    navLink: {
      textDecoration: 'none',
      color: '#262626',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontWeight: 500,
      fontSize: '14px',
      transition: 'all 0.3s ease',
    },
    navLinkActive: {
      color: '#e11d48',
    },
    navRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginLeft: 'auto',
    },
    themeIcon: {
      fontSize: '18px',
      color: '#262626',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    cartBtn: {
      background: '#e11d48',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      padding: '8px 16px',
      fontWeight: 600,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '14px',
    },
    signInBtn: {
      color: '#e11d48',
      border: '2px solid #e11d48',
      borderRadius: '6px',
      padding: '6px 16px',
      fontWeight: 600,
      cursor: 'pointer',
      background: 'transparent',
      fontSize: '14px',
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
    },
    signUpBtn: {
      background: '#e11d48',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      padding: '8px 16px',
      fontWeight: 600,
      cursor: 'pointer',
      fontSize: '14px',
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
    },
    main: {
      padding: '40px 24px',
      color: '#262626',
    },
    adminBtn: {
      color: '#e11d48',
      border: '2px solid #e11d48',
      borderRadius: '6px',
      padding: '6px 16px',
      fontWeight: 600,
      cursor: 'pointer',
      background: 'transparent',
      fontSize: '14px',
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
    },
    footer: {
      backgroundColor: '#f8f9fa',
      color: '#595959',
      padding: '60px 40px 20px',
      marginTop: 'auto',
      borderTop: '1px solid #e8e8e8',
    },
    footerTitle: {
      color: '#262626',
      fontSize: '18px',
      fontWeight: 600,
      marginBottom: '24px',
    },
    footerLink: {
      color: '#595959',
      display: 'block',
      marginBottom: '12px',
      textDecoration: 'none',
      transition: 'color 0.3s',
      fontSize: '14px',
    },
    socialIcon: {
      fontSize: '24px',
      color: '#595959',
      cursor: 'pointer',
      transition: 'color 0.3s',
    },
    footerBottom: {
      textAlign: 'center' as const,
      color: '#8c8c8c',
      marginTop: '20px',
      fontSize: '14px',
    }
  }
  const nav = useNavigate();
  const {
    isAuthenticated,
    user,
    clearAuth,
  } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      clearAuth();
      nav('/');
    } catch (error) {
      console.log(error)
    }
  }

  const handleConfirmLogout = async () => {
    const result = Swal.fire({
      title: "bạn có chắc muốn đăng xuất không",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#05803bff",
      cancelButtonColor: "#dc2626",
      confirmButtonText: "Đăng xuất",
      cancelButtonText: "Hủy"
    })
    if ((await result).isConfirmed) {
      handleLogout();
      Swal.fire({
        title: "đăng xuất thành công",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      })
    }
  }

  const userMenuItems = [
    ...(user?.role === 'admin' ? [
      {
        key: 'admin',
        icon: <DashboardOutlined />,
        label: <NavLink to="/admin">Kênh quản trị</NavLink>,
      },
      { type: 'divider' as const },
    ] : []),
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <NavLink to={`/profile/${user._id}`}>Thông tin người dùng</NavLink>,
    },
    {
      key: 'history',
      icon: <HistoryOutlined />,
      label: <NavLink to="/booking-history">Lịch sử đặt vé</NavLink>,
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
      onClick: handleConfirmLogout
    },
  ];

  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <NavLink to="/" style={styles.brand}>
          <VideoCameraOutlined style={styles.brandIcon} />
          <span className="brand-mark">L</span>
          <span>Lumora</span>
        </NavLink>

        <nav style={styles.navCenter}>
          <NavLink to="/" style={({ isActive }) => ({ ...styles.navLink, ...(isActive && styles.navLinkActive) })}>
            <HomeOutlined />
            <span>Trang Chủ</span>
          </NavLink>
          <NavLink to="/movies" style={({ isActive }) => ({ ...styles.navLink, ...(isActive && styles.navLinkActive) })}>
            <VideoCameraOutlined />
            <span>Phim</span>
          </NavLink>
          <NavLink to="/promotions" style={({ isActive }) => ({ ...styles.navLink, ...(isActive && styles.navLinkActive) })}>
            <EnvironmentOutlined />
            <span>Khuyến Mãi</span>
          </NavLink>
          <NavLink to="/contact" style={({ isActive }) => ({ ...styles.navLink, ...(isActive && styles.navLinkActive) })}>
            <PhoneOutlined />
            <span>Liên Hệ</span>
          </NavLink>
        </nav>

        <div style={styles.navRight}>


          {isAuthenticated && (
            <>


              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Space size="middle" style={{ cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', border: '1px solid #f0f0f0', background: '#fafafa' }}>
                  <Avatar size={42} style={{ backgroundColor: '#e11d48' }} icon={<UserOutlined style={{ fontSize: '20px' }} />} />
                  <Text strong style={{ fontSize: '15px' }}>{user?.fullName || user?.email?.split('@')[0] || 'User'}</Text>
                </Space>
              </Dropdown>
            </>
          )}

          {!isAuthenticated && (
            <>
              <NavLink to="/signIn" style={styles.signInBtn}>
                Đăng nhập
              </NavLink>
              <NavLink to="/signUp" style={styles.signUpBtn}>
                Đăng ký
              </NavLink>
            </>
          )}
        </div>
      </header>

      <main style={styles.main}>
        <Outlet />
      </main>

      <footer style={styles.footer}>
        <Row gutter={[32, 32]}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <div style={{ ...styles.brand, color: '#e11d48', marginBottom: '20px', marginRight: 0 }}>
              <VideoCameraOutlined style={styles.brandIcon} />
              <span className="brand-mark">L</span>
              <span>Lumora</span>
            </div>
            <p style={{ color: '#595959', lineHeight: '1.6', marginBottom: '20px' }}>
              Lumora - Hệ thống rạp chiếu phim hiện đại với chất lượng hình ảnh và âm thanh tuyệt hảo, mang đến trải nghiệm điện ảnh đỉnh cao cho khán giả.
            </p>
            <Space size="large">
              <FacebookOutlined style={styles.socialIcon} className="social-icon-hover" />
              <TwitterOutlined style={styles.socialIcon} className="social-icon-hover" />
              <InstagramOutlined style={styles.socialIcon} className="social-icon-hover" />
              <YoutubeOutlined style={styles.socialIcon} className="social-icon-hover" />
            </Space>
          </Col>

          <Col xs={24} sm={12} md={8} lg={6}>
            <div style={styles.footerTitle}>VỀ LUMORA</div>
            <NavLink to="/about" style={styles.footerLink} className="footer-link-hover"><InfoCircleOutlined style={{ marginRight: '8px' }} />Giới Thiệu</NavLink>
            <NavLink to="/careers" style={styles.footerLink} className="footer-link-hover"><TeamOutlined style={{ marginRight: '8px' }} />Tuyển Dụng</NavLink>
            <NavLink to="/contact" style={styles.footerLink} className="footer-link-hover"><MailOutlined style={{ marginRight: '8px' }} />Liên Hệ</NavLink>
            <NavLink to="/terms" style={styles.footerLink} className="footer-link-hover"><FileTextOutlined style={{ marginRight: '8px' }} />Điều Khoản Sử Dụng</NavLink>
            <NavLink to="/privacy" style={styles.footerLink} className="footer-link-hover"><SafetyCertificateOutlined style={{ marginRight: '8px' }} />Chính Sách Bảo Mật</NavLink>
          </Col>

          <Col xs={24} sm={12} md={8} lg={6}>
            <div style={styles.footerTitle}>HỖ TRỢ KHÁCH HÀNG</div>
            <NavLink to="/faq" style={styles.footerLink} className="footer-link-hover"><QuestionCircleOutlined style={{ marginRight: '8px' }} />Câu Hỏi Thường Gặp</NavLink>
            <NavLink to="/booking-guide" style={styles.footerLink} className="footer-link-hover"><BookOutlined style={{ marginRight: '8px' }} />Hướng Dẫn Đặt Vé</NavLink>
            <NavLink to="/refund-policy" style={styles.footerLink} className="footer-link-hover"><MoneyCollectOutlined style={{ marginRight: '8px' }} />Chính Sách Hoàn Tiền</NavLink>
            <NavLink to="/member" style={styles.footerLink} className="footer-link-hover"><CrownOutlined style={{ marginRight: '8px' }} />Thành Viên Lumora</NavLink>
            <NavLink to="/promotions" style={styles.footerLink} className="footer-link-hover"><GiftOutlined style={{ marginRight: '8px' }} />Khuyến Mãi Cuối Tuần</NavLink>
          </Col>

          <Col xs={24} sm={12} md={8} lg={6}>
            <div style={styles.footerTitle}>ĐĂNG KÝ NHẬN TIN</div>
            <p style={{ color: '#595959', marginBottom: '16px' }}>
              Nhận thông tin về các bộ phim mới nhất và khuyến mãi hấp dẫn.
            </p>
            <Space.Compact style={{ width: '100%' }}>
              <Input placeholder="Nhập email của bạn" />
              <Button type="primary" style={{ backgroundColor: '#e11d48' }}>Đăng Ký</Button>
            </Space.Compact>
          </Col>
        </Row>

        <Divider style={{ borderColor: '#e8e8e8', margin: '32px 0 20px 0' }} />

        <div style={styles.footerBottom}>
          © {new Date().getFullYear()} Lumora Cinema. Đã đăng ký bản quyền.
        </div>
        <style>
          {`
            .social-icon-hover:hover { color: #e11d48 !important; }
            .footer-link-hover:hover { color: #e11d48 !important; }
          `}
        </style>
      </footer>
    </div>
  )
}

export default ClientLayout