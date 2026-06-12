import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMovies } from '../../features/movie/movie.service'
import type { Movie, MovieStatus } from '../../features/movie/movie.types'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Typography,
  Space,
  message,
} from 'antd'
import {
  VideoCameraOutlined,
  PlayCircleOutlined,
  CalendarOutlined,
  EyeInvisibleOutlined,
  RightOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { Title, Text } = Typography

function Dashboard() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getMovies()
      .then((data) => {
        setMovies(data)
      })
      .catch(() => setError('Không thể lấy dữ liệu từ Dashboard'))
      .finally(() => setIsLoading(false))
  }, [])

  const stats = useMemo(
    () => [
      { label: 'Tổng phim', value: movies.length },
      { label: 'Đang chiếu', value: movies.filter((movie) => movie.status === 'now_showing').length },
      { label: 'Sắp chiếu', value: movies.filter((movie) => movie.status === 'coming_soon').length },
      { label: 'Tạm ẩn', value: movies.filter((movie) => movie.isActive === false).length },

    ],
    [movies],
  )

  return (
    <section className="admin-page">
      {error && <p className="state-text error-text">{error}</p>}
      {isLoading && <p className="state-text">Đang tải dashboard...</p>}

      <div className="stats-grid">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>

  const columns: ColumnsType<Movie> = [
    {
      title: 'Phim',
      key: 'movie',
      render: (_, record) => (
        <Space size={12}>
          {record.posterUrl && (
            <img
              src={record.posterUrl}
              alt={record.title}
              style={{ width: 35, height: 50, objectFit: 'cover', borderRadius: 4 }}
            />
          )}
          <div>
            <p className="eyebrow">Dữ liệu từ API</p>
            <h2>Phim mới cập nhật</h2>
          </div>
          <Link className="primary-button compact" to="/admin/movies">
            Quản lý phim
          </Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tên phim</th>
                <th>Trạng thái</th>
                <th>Thời lượng</th>
                <th>Ngày chiếu</th>
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
                  <td colSpan={4}>Chưa có phim nào</td>
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
