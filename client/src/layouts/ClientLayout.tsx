import { NavLink, Outlet } from 'react-router-dom'
import { HomeOutlined, VideoCameraOutlined, EnvironmentOutlined, PhoneOutlined, ShoppingCartOutlined, BgColorsOutlined } from '@ant-design/icons'

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
      color: '#ff4757',
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
      color: '#ff4757',
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
      background: '#ff4757',
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
      color: '#ff4757',
      border: '2px solid #ff4757',
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
      background: '#ff4757',
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
  }

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
          <BgColorsOutlined style={styles.themeIcon} />
          <button style={styles.cartBtn}>
            <ShoppingCartOutlined />
            Mua Vé
          </button>
          <NavLink to="/signIn" style={styles.signInBtn}>
            Đăng nhập
          </NavLink>
          <NavLink to="/signUp" style={styles.signUpBtn}>
            Đăng ký
          </NavLink>
        </div>
      </header>

      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}

export default ClientLayout