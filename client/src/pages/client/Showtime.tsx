import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMovieById } from '../../features/movie/movie.service'
import { getAllShowtimes } from '../../features/showtime/showtime.service'
import { format, addDays, isSameDay } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { Showtime as ShowtimeType } from '../../features/showtime/showtime.type'

function Showtime() {
    const { movieId } = useParams()
    const navigate = useNavigate()

    const dates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i))
    const [selectedDate, setSelectedDate] = useState<Date>(dates[0])

    const { data: movie, isLoading: isMovieLoading, error: movieError } = useQuery({
        queryKey: ['movie', movieId],
        queryFn: () => getMovieById(movieId || ''),
        enabled: !!movieId
    })

    const { data: showtimes, isLoading: isShowtimesLoading, error: showtimesError } = useQuery({
        queryKey: ['showtimes', movieId],
        queryFn: () => getAllShowtimes({ movie: movieId }),
        enabled: !!movieId
    })

    if (isMovieLoading || isShowtimesLoading) {
        return (
            <div className="page-state">
                <p className="state-text">Đang tải thông tin lịch chiếu...</p>
            </div>
        )
    }

    if (movieError || showtimesError || !movie) {
        return (
            <div className="page-state">
                <p className="state-text error-text">Không thể tải lịch chiếu phim này.</p>
                <Link className="ghost-button" to="/">Quay lại</Link>
            </div>
        )
    }

    const filteredShowtimes = showtimes?.filter(st => {
        const stDate = new Date(st.startTime)
        return isSameDay(stDate, selectedDate)
    }) || []

    const groupedShowtimes = filteredShowtimes.reduce((acc, st) => {
        const cinemaId = st.cinema._id
        const formatType = st.format || '2D'

        if (!acc[cinemaId]) {
            acc[cinemaId] = {
                cinemaName: st.cinema.name,
                formats: {}
            }
        }
        if (!acc[cinemaId].formats[formatType]) {
            acc[cinemaId].formats[formatType] = []
        }
        acc[cinemaId].formats[formatType].push(st)
        return acc
    }, {} as Record<string, { cinemaName: string; formats: Record<string, ShowtimeType[]> }>)

    return (
        <div className="showtime-page-container">

            <div className="showtime-movie-header">
                <div className="showtime-poster">
                    {movie.posterUrl ? (
                        <img src={movie.posterUrl} alt={movie.title} />
                    ) : (
                        <div className="poster-fallback">{movie.title.charAt(0)}</div>
                    )}
                </div>
                <div className="showtime-movie-details">
                    <span className="badge">{movie.ageRating}</span>
                    <h1>{movie.title}</h1>
                    <p className="movie-meta">
                        <span>{movie.duration} phút</span>
                        <span className="dot">•</span>
                        <span>{movie.genres?.join(', ') || 'Hành Động, Kịch Tính'}</span>
                    </p>
                    <p className="movie-desc">{movie.description}</p>
                </div>
            </div>

            <div className="date-picker-section">
                <h3 className="section-title">Chọn Ngày Chiếu</h3>
                <div className="date-picker-scroll">
                    {dates.map((date, idx) => {
                        const active = isSameDay(date, selectedDate)
                        return (
                            <button
                                key={idx}
                                className={`date-tab-card ${active ? 'active' : ''}`}
                                onClick={() => setSelectedDate(date)}
                                type="button"
                            >
                                <span className="date-day-name">
                                    {idx === 0 ? 'Hôm nay' : format(date, 'EEEE', { locale: vi })}
                                </span>
                                <span className="date-day-number">
                                    {format(date, 'dd/MM')}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="showtimes-section">
                <h3 className="section-title">Lịch Chiếu Hôm Nay</h3>

                {Object.keys(groupedShowtimes).length === 0 ? (
                    <div className="empty-showtimes-card">
                        <p className="empty-text">Không có suất chiếu nào vào ngày đã chọn.</p>
                        <p className="empty-subtext">Vui lòng chọn một ngày chiếu khác ở trên.</p>
                    </div>
                ) : (
                    Object.values(groupedShowtimes).map((cinemaGroup, idx) => (
                        <div key={idx} className="cinema-group-card">
                            <div className="cinema-group-title">
                                <h4>{cinemaGroup.cinemaName}</h4>
                            </div>

                            <div className="cinema-formats-container">
                                {Object.entries(cinemaGroup.formats).map(([formatType, list]) => (
                                    <div key={formatType} className="format-row">
                                        <div className="format-badge-wrapper">
                                            <span className="showtime-format-badge">{formatType}</span>
                                        </div>
                                        <div className="time-slots-grid">
                                            {list.map((st) => {
                                                const startHour = format(new Date(st.startTime), 'HH:mm')
                                                return (
                                                    <button
                                                        key={st._id}
                                                        className="time-slot-btn"
                                                        onClick={() => navigate(`/booking/${st._id}`)}
                                                        type="button"
                                                    >
                                                        <span className="time-value">{startHour}</span>
                                                        <span className="room-value">{st.room.name}</span>
                                                        <span className="price-value">
                                                            {st.basePrice.toLocaleString('vi-VN')}đ
                                                        </span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="showtime-footer-actions">
                <Link className="ghost-button" to={`/movies/${movieId}`}>
                    Quay lại Chi tiết phim
                </Link>
            </div>
        </div>
    )
}

export default Showtime