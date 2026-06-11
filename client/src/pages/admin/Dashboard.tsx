import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMovies } from '../../features/movie/movie.service'
import type { Movie } from '../../features/movie/movie.types'

function Dashboard() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getMovies()
      .then((data) => {
        setMovies(data)
        setError('')
      })
      .catch(() => setError('Khong the lay du lieu dashboard.'))
      .finally(() => setIsLoading(false))
  }, [])

  const stats = useMemo(
    () => [
      { label: 'Tong phim', value: movies.length },
      { label: 'Dang chieu', value: movies.filter((movie) => movie.status === 'now_showing').length },
      { label: 'Sap chieu', value: movies.filter((movie) => movie.status === 'coming_soon').length },
      { label: 'Tam an', value: movies.filter((movie) => movie.isActive === false).length },
    ],
    [movies],
  )

  return (
    <section className="admin-page">
      {error && <p className="state-text error-text">{error}</p>}
      {isLoading && <p className="state-text">Dang tai dashboard...</p>}

      <div className="stats-grid">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>

      <div className="admin-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Du lieu tu API</p>
            <h2>Phim moi cap nhat</h2>
          </div>
          <Link className="primary-button compact" to="/admin/movies">
            Quan ly phim
          </Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ten phim</th>
                <th>Trang thai</th>
                <th>Thoi luong</th>
                <th>Ngay chieu</th>
              </tr>
            </thead>
            <tbody>
              {movies.slice(0, 6).map((movie) => (
                <tr key={movie._id}>
                  <td>{movie.title}</td>
                  <td>{movie.status}</td>
                  <td>{movie.duration} phut</td>
                  <td>{new Date(movie.releaseDate).toLocaleDateString('vi-VN')}</td>
                </tr>
              ))}
              {!isLoading && movies.length === 0 && (
                <tr>
                  <td colSpan={4}>Chua co phim nao.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default Dashboard
