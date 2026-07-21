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
          <p className="eyebrow">Chào mừng đến Lumora</p>
          <h1>Đặt Lịch Xem Phim Nhanh Chóng Lumora </h1>
          <p>
            Khám phá hàng trăm bộ phim hấp dẫn với lịch chiếu được cập nhật liên tục.
            Dễ dàng chọn rạp, suất chiếu và vị trí ghế yêu thích, thanh toán nhanh chóng
            chỉ với vài thao tác.
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