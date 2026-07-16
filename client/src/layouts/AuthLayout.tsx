import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { getMovies } from '../features/movie/movie.service'
import type { Movie } from '../features/movie/movie.types'

function AuthLayout() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [activeIdx, setActiveIdx] = useState(0)

  // Fetch phim đang chiếu từ backend
  useEffect(() => {
    getMovies({ status: 'now_showing' })
      .then((data) => {
        if (data && data.length > 0) {
          setMovies(data)
        }
      })
      .catch(() => {
        // Lỗi thì giữ nguyên trạng thái rỗng, hero fallback vẫn hiển thị
      })
  }, [])

  // Tự động chuyển phim mỗi 4 giây
  useEffect(() => {
    if (movies.length <= 1) return
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % movies.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [movies.length])

  const featuredMovie = movies[activeIdx]

  return (
    <main className="auth-shell">
      {/* ── Hero trái: hiển thị phim đang chiếu từ backend ── */}
      <section className="auth-hero auth-hero-live">
        <Link className="brand" to="/">
          <span className="brand-mark">L</span>
          <span>Lumora</span>
        </Link>

        {featuredMovie ? (
          <div className="auth-hero-content">
            {/* Poster backdrop */}
            {featuredMovie.posterUrl && (
              <div className="auth-hero-backdrop">
                <img
                  src={featuredMovie.posterUrl}
                  alt={featuredMovie.title}
                  className="auth-backdrop-img"
                />
                <div className="auth-backdrop-overlay" />
              </div>
            )}

            {/* Card thông tin phim */}
            <div className="auth-movie-card">
              <div className="auth-movie-poster-wrap">
                {featuredMovie.posterUrl ? (
                  <img
                    src={featuredMovie.posterUrl}
                    alt={featuredMovie.title}
                    className="auth-movie-poster-img"
                  />
                ) : (
                  <div className="auth-movie-poster-fallback">
                    {featuredMovie.title.charAt(0)}
                  </div>
                )}
              </div>
              <div className="auth-movie-info">
                <span className="auth-now-badge">● Đang chiếu</span>
                <h1 className="auth-movie-title">{featuredMovie.title}</h1>
                {featuredMovie.originalTitle && (
                  <p className="auth-movie-original">{featuredMovie.originalTitle}</p>
                )}
                <div className="auth-movie-meta">
                  {featuredMovie.genres?.length > 0 && (
                    <span className="auth-movie-genre">
                      {featuredMovie.genres.slice(0, 2).join(' / ')}
                    </span>
                  )}
                  <span className="auth-movie-dot">•</span>
                  <span className="auth-movie-duration">{featuredMovie.duration} phút</span>
                  <span className="auth-movie-dot">•</span>
                  <span className="auth-movie-age">{featuredMovie.ageRating}</span>
                </div>
                {featuredMovie.description && (
                  <p className="auth-movie-desc">
                    {featuredMovie.description.length > 120
                      ? featuredMovie.description.slice(0, 120) + '...'
                      : featuredMovie.description}
                  </p>
                )}
                <Link to={`/movies/${featuredMovie._id}/showtimes`} className="auth-book-btn">
                  Đặt vé ngay →
                </Link>
              </div>
            </div>

            {/* Chấm chuyển slide */}
            {movies.length > 1 && (
              <div className="auth-dots">
                {movies.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`auth-dot ${i === activeIdx ? 'active' : ''}`}
                    onClick={() => setActiveIdx(i)}
                    aria-label={`Phim ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Fallback khi chưa load được hoặc không có phim
          <div>
            <p className="eyebrow">Thành viên Lumora</p>
            <h1>Đăng nhập để đặt vé và quản lý lịch xem phim.</h1>
            <p>
              Tài khoản của bạn được dùng cho trang khách hàng và phần quản trị nếu
              có quyền admin.
            </p>
          </div>
        )}
      </section>

      {/* ── Phải: Form đăng nhập/đăng ký ── */}
      <section className="auth-panel">
        <Outlet />
      </section>
    </main>
  )
}

export default AuthLayout
