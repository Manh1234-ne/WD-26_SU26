import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { HomeOutlined, VideoCameraOutlined, EnvironmentOutlined, PhoneOutlined, ShoppingCartOutlined, BgColorsOutlined, UserOutlined, HistoryOutlined, LogoutOutlined, DashboardOutlined } from '@ant-design/icons'
import { useAuth } from '../features/auth/hooks/useAuth'
import { Button, Dropdown, Avatar, Space, Typography } from 'antd'
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
      label: <NavLink to="/profile">Thông tin người dùng</NavLink>,
    },
    {
      key: 'history',
      icon: <HistoryOutlined />,
      label: <NavLink to="/history">Lịch sử đặt vé</NavLink>,
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
    </div>
  )
}

export default ClientLayout