import { Link, Outlet } from 'react-router-dom'

function AuthLayout() {
  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <Link className="brand" to="/">
          <span className="brand-mark">L</span>
          <span>Lumora</span>
        </Link>
        <div>
          <p className="eyebrow">Thành viên Lumora</p>
          <h1>Đăng nhập để đặt vé và quản lý lịch xem phim.</h1>
          <p>
            Tài khoản của bạn được dùng cho trang khách hàng và phần quản trị nếu
            có quyền admin.
          </p>
        </div>
      </section>
      <section className="auth-panel">
        <Outlet />
      </section>
    </main>
  )
}

export default AuthLayout
