import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMovieById } from '../../features/movie/movie.service'
import type { Movie } from '../../features/movie/movie.types'

function MovieDetail() {
  const { id } = useParams()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) {
      return
    }

    setIsLoading(true)
    getMovieById(id)
      .then((data) => {
        setMovie(data)
        setError('')
      })
      .catch(() => setError('không thể tải trang chi tiết phim...'))
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) {
    return <p className="state-text page-state">loading...</p>
  }

  if (error || !movie) {
    return (
      <div className="page-state">
        <p className="state-text error-text">{error || 'Khong tim thay phim.'}</p>
        <Link className="ghost-button" to="/">
          Quay lai
        </Link>
      </div>
    )
  }

  return (
    <section className="detail-page">
      <div className="detail-poster">
        {movie.posterUrl ? (
          <img src={movie.posterUrl} alt={movie.title} />
        ) : (
          <div className="poster-fallback">{movie.title.charAt(0)}</div>
        )}
      </div>
      <div className="detail-copy">
        <p className="eyebrow">{movie.genres?.join(' / ') || 'LUMORA'}</p>
        <h1>{movie.title}</h1>
        {movie.originalTitle && <h2>{movie.originalTitle}</h2>}
        <p>{movie.description}</p>
        <dl className="detail-list">
          <div>
            <dt>Thời lượng</dt>
            <dd>{movie.duration} phút</dd>
          </div>
          <div>
            <dt>Ngôn Ngữ</dt>
            <dd>{movie.language || "đang cập nhật"}</dd>
          </div>
          <div>
            <dt>Đạo diễn</dt>
            <dd>{movie.director || 'đang cập nhật'}</dd>
          </div>
          <div>
            <dt>Độ tuổi</dt>
            <dd>{movie.ageRating}</dd>
          </div>
        </dl>
        <Link className="primary-button" to="/">
          Quay lại
        </Link>
      </div>
    </section>
  )
}

export default MovieDetail
