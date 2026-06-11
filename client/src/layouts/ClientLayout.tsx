import { NavLink, Outlet } from 'react-router-dom'

function ClientLayout() {
  return (
    <div className="client-shell">
      <header className="site-header">
        <NavLink className="brand" to="/">
          <span className="brand-mark">L</span>
          <span>Lumora</span>
        </NavLink>
        <nav className="site-nav">
          <NavLink to="/">Trang chủ</NavLink>
        </nav>
        <nav className='site-nav'>
          <NavLink to="/signIn">Đăng nhập</NavLink>
          <NavLink to="/signUp">Đăng ký</NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export default ClientLayout
