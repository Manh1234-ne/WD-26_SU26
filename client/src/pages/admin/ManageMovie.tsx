import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  createMovie,
  deleteMovie,
  getMovies,
  updateMovie,
} from '../../features/movie/movie.service'
import type { Movie, MoviePayload, MovieStatus } from '../../features/movie/movie.types'


type MovieForm = {
  title: string
  originalTitle: string
  description: string
  genres: string
  duration: string
  releaseDate: string
  ageRating: MoviePayload['ageRating']
  language: string
  director: string
  cast: string
  posterUrl: string
  backdropUrl: string
  trailerUrl: string
  status: MovieStatus
  averageRating: string
  isActive: boolean
}

const emptyForm: MovieForm = {
  title: '',
  originalTitle: '',
  description: '',
  genres: '',
  duration: '90',
  releaseDate: new Date().toISOString().slice(0, 10),
  ageRating: 'P',
  language: 'Vietnamese',
  director: '',
  cast: '',
  posterUrl: '',
  backdropUrl: '',
  trailerUrl: '',
  status: 'coming_soon',
  averageRating: '0',
  isActive: true,
}

function toList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function toPayload(form: MovieForm): MoviePayload {
  return {
    title: form.title.trim(),
    originalTitle: form.originalTitle.trim(),
    description: form.description.trim(),
    genres: toList(form.genres),
    duration: Number(form.duration),
    releaseDate: form.releaseDate,
    ageRating: form.ageRating,
    language: form.language.trim(),
    director: form.director.trim(),
    cast: toList(form.cast),
    posterUrl: form.posterUrl.trim(),
    backdropUrl: form.backdropUrl.trim(),
    trailerUrl: form.trailerUrl.trim(),
    status: form.status,
    averageRating: Number(form.averageRating),
    isActive: form.isActive,
  }
}

function toForm(movie: Movie): MovieForm {
  return {
    title: movie.title,
    originalTitle: movie.originalTitle || '',
    description: movie.description,
    genres: movie.genres?.join(', ') || '',
    duration: String(movie.duration),
    releaseDate: new Date(movie.releaseDate).toISOString().slice(0, 10),
    ageRating: movie.ageRating,
    language: movie.language || 'Vietnamese',
    director: movie.director || '',
    cast: movie.cast?.join(', ') || '',
    posterUrl: movie.posterUrl || '',
    backdropUrl: movie.backdropUrl || '',
    trailerUrl: movie.trailerUrl || '',
    status: movie.status,
    averageRating: String(movie.averageRating || 0),
    isActive: movie.isActive ?? true,
  }
}

function ManageMovie() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [form, setForm] = useState<MovieForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const sortedMovies = useMemo(
    () => [...movies].sort((a, b) => a.title.localeCompare(b.title)),
    [movies],
  )

  const loadMovies = async () => {
    setIsLoading(true)
    try {
      const data = await getMovies()
      setMovies(data)
      setError('')
    } catch {
      setError('Khong the tai danh sach phim.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadMovies()
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setMessage('')
    setError('')

    try {
      if (editingId) {
        await updateMovie(editingId, toPayload(form))
        setMessage('Da cap nhat phim.')
      } else {
        await createMovie(toPayload(form))
        setMessage('Da them phim moi.')
      }

      setForm(emptyForm)
      setEditingId(null)
      await loadMovies()
    } catch {
      setError('Luu phim that bai. Kiem tra cac truong bat buoc.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (movie: Movie) => {
    setEditingId(movie._id)
    setForm(toForm(movie))
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (movie: Movie) => {
    const confirmed = window.confirm(`Xoa phim "${movie.title}"?`)

    if (!confirmed) {
      return
    }

    try {
      await deleteMovie(movie._id)
      setMessage('Da xoa phim.')
      await loadMovies()
    } catch {
      setError('Xoa phim that bai.')
    }
  }

  const updateField = <Key extends keyof MovieForm>(key: Key, value: MovieForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <section className="admin-page movie-manager">
      <div className="admin-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">API /movies</p>
            <h2>{editingId ? 'Cap nhat phim' : 'Them phim moi'}</h2>
          </div>
          {editingId && (
            <button
              className="ghost-button compact"
              onClick={() => {
                setEditingId(null)
                setForm(emptyForm)
              }}
              type="button"
            >
              Huy sua
            </button>
          )}
        </div>

        {message && <p className="state-text success-text">{message}</p>}
        {error && <p className="state-text error-text">{error}</p>}

        <form className="movie-form" onSubmit={handleSubmit}>
          <label>
            Ten phim
            <input
              required
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
            />
          </label>
          <label>
            Ten goc
            <input
              value={form.originalTitle}
              onChange={(event) => updateField('originalTitle', event.target.value)}
            />
          </label>
          <label className="wide">
            Mo ta
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
            />
          </label>
          <label>
            The loai
            <input
              placeholder="Action, Drama"
              value={form.genres}
              onChange={(event) => updateField('genres', event.target.value)}
            />
          </label>
          <label>
            Dien vien
            <input
              placeholder="Ten 1, Ten 2"
              value={form.cast}
              onChange={(event) => updateField('cast', event.target.value)}
            />
          </label>
          <label>
            Thoi luong
            <input
              min={1}
              required
              type="number"
              value={form.duration}
              onChange={(event) => updateField('duration', event.target.value)}
            />
          </label>
          <label>
            Ngay chieu
            <input
              required
              type="date"
              value={form.releaseDate}
              onChange={(event) => updateField('releaseDate', event.target.value)}
            />
          </label>
          <label>
            Phan loai
            <select
              value={form.ageRating}
              onChange={(event) => updateField('ageRating', event.target.value as MovieForm['ageRating'])}
            >
              {['P', 'K', 'T13', 'T16', 'T18', 'C'].map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
          </label>
          <label>
            Trang thai
            <select
              value={form.status}
              onChange={(event) => updateField('status', event.target.value as MovieStatus)}
            >
              <option value="coming_soon">Sap chieu</option>
              <option value="now_showing">Dang chieu</option>
              <option value="ended">Da ket thuc</option>
            </select>
          </label>
          <label>
            Ngon ngu
            <input
              value={form.language}
              onChange={(event) => updateField('language', event.target.value)}
            />
          </label>
          <label>
            Dao dien
            <input
              value={form.director}
              onChange={(event) => updateField('director', event.target.value)}
            />
          </label>
          <label>
            Diem TB
            <input
              max={5}
              min={0}
              step="0.1"
              type="number"
              value={form.averageRating}
              onChange={(event) => updateField('averageRating', event.target.value)}
            />
          </label>
          <label className="wide">
            Poster URL
            <input
              value={form.posterUrl}
              onChange={(event) => updateField('posterUrl', event.target.value)}
            />
          </label>
          <label className="wide">
            Backdrop URL
            <input
              value={form.backdropUrl}
              onChange={(event) => updateField('backdropUrl', event.target.value)}
            />
          </label>
          <label className="wide">
            Trailer URL
            <input
              value={form.trailerUrl}
              onChange={(event) => updateField('trailerUrl', event.target.value)}
            />
          </label>
          <label className="checkbox-label">
            <input
              checked={form.isActive}
              type="checkbox"
              onChange={(event) => updateField('isActive', event.target.checked)}
            />
            Dang hien thi
          </label>
          <button className="primary-button form-submit" disabled={isSaving} type="submit">
            {isSaving ? 'Dang luu...' : editingId ? 'Luu thay doi' : 'Them phim'}
          </button>
        </form>
      </div>

      <div className="admin-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Danh sach</p>
            <h2>Kho phim</h2>
          </div>
          <button className="ghost-button compact" onClick={loadMovies} type="button">
            Tai lai
          </button>
        </div>
        {isLoading && <p className="state-text">Dang tai phim...</p>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Phim</th>
                <th>Trang thai</th>
                <th>Ngay chieu</th>
                <th>Hien thi</th>
                <th>Thao tac</th>
              </tr>
            </thead>
            <tbody>
              {sortedMovies.map((movie) => (
                <tr key={movie._id}>
                  <td>
                    <strong>{movie.title}</strong>
                    <span>{movie.genres?.join(', ')}</span>
                  </td>
                  <td>{movie.status}</td>
                  <td>{new Date(movie.releaseDate).toLocaleDateString('vi-VN')}</td>
                  <td>{movie.isActive === false ? 'An' : 'Hien'}</td>
                  <td>
                    <div className="table-actions">
                      <button className="text-button" onClick={() => handleEdit(movie)} type="button">
                        Sua
                      </button>
                      <button className="danger-button" onClick={() => handleDelete(movie)} type="button">
                        Xoa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && sortedMovies.length === 0 && (
                <tr>
                  <td colSpan={5}>Chua co phim nao.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default ManageMovie
