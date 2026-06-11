import { NavLink, Outlet } from 'react-router-dom'

const adminLinks = [
  { to: '/admin', label: 'Tong quan', end: true },
  { to: '/admin/movies', label: 'Quan ly phim' },
]

function AdminLayout() {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <NavLink className="brand admin-brand" to="/">
          <span className="brand-mark">C</span>
          <span>Admin</span>
        </NavLink>
        <nav className="admin-nav">
          {adminLinks.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">Bảng điều khiển</p>
            <h1>Quản trị Lumora</h1>
          </div>
          <NavLink className="secondary-link" to="/">
            Xem trang chủ
          </NavLink>
        </header>
        <Outlet />
      </div>
    </div>
  )
}

export default AdminLayout
