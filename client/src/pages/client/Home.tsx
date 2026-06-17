import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMovies } from '../../features/movie/movie.service'
import type { Movie, MovieStatus } from '../../features/movie/movie.types'

const statusTabs: Array<{ label: string; value: MovieStatus | 'all' }> = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Đang chiếu', value: 'now_showing' },
  { label: 'Sắp chiếu', value: 'coming_soon' },
  { label: 'Đã kết thúc', value: 'ended' },
]

const statusLabel: Record<MovieStatus, string> = {
  coming_soon: 'Sắp chiếu',
  now_showing: 'Đang chiếu',
  ended: 'Đã kết thúc',
}

function Home() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [status, setStatus] = useState<MovieStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    getMovies({ status, search: search.trim() })
      .then((data) => {
        if (isMounted) {
          setMovies(data)
          setError('')
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Không thể tải danh sách phim. Hãy kiểm tra server backend.')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [status, search])

  const heroMovie = useMemo(
    () => movies.find((movie) => movie.status === 'now_showing') || movies[0],
    [movies],
  )

  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">Đặt vé nhanh - chọn ghế dễ dàng</p>
          <h1>{heroMovie?.title || 'Cinema Booking'}</h1>
          <p>
            {heroMovie?.description ||
              'Khám phá lịch chiếu, phim mới và quản lý rạp ngay tr'}
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#movies">
              Xem phim
            </a>
          </div>
        </div>
        <div className="hero-poster" aria-label="Phim noi bat">
          {heroMovie?.posterUrl ? (
            <img src={heroMovie.posterUrl} alt={heroMovie.title} />
          ) : (
            <div className="poster-fallback">{heroMovie?.title?.charAt(0) || 'LUMORA'}</div>
          )}
          <div className="poster-meta">
            <span>{heroMovie ? statusLabel[heroMovie.status] : 'Sẵn sàng'}</span>
            <strong>{heroMovie?.duration ? `${heroMovie.duration} phút` : 'API /movies'}</strong>
          </div>
        </div>
      </section>

      <section className="movie-section" id="movies">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Danh sách phim</p>
            <h2>Phim tại rạp</h2>
          </div>
          <input
            className="search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tim phim..."
          />
        </div>

        <div className="segmented-control" role="tablist" aria-label="Lọc phim">
          {statusTabs.map((tab) => (
            <button
              className={status === tab.value ? 'active' : ''}
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading && <p className="state-text">Đang tải phim</p>}
        {error && <p className="state-text error-text">{error}</p>}
        {!isLoading && !error && movies.length === 0 && (
          <p className="state-text">Chưa có phim nào phù hợp.</p>
        )}

        <div className="movie-grid">
          {movies.map((movie) => (
            <article className="movie-card" key={movie._id}>
              <Link className="movie-poster" to={`/movies/${movie._id}`}>
                {movie.posterUrl ? (
                  <img src={movie.posterUrl} alt={movie.title} />
                ) : (
                  <div className="poster-fallback">{movie.title.charAt(0)}</div>
                )}
              </Link>
              <div className="movie-card-body">
                <span className="badge">{statusLabel[movie.status]}</span>
                <h3>{movie.title}</h3>
                <p>{movie.genres?.join(', ') || 'Cinema'}</p>
                <div className="movie-card-footer">
                  <span>{movie.duration} phút</span>
                  <span>{movie.ageRating}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}

export default Home
