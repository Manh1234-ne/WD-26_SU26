import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMovieById } from '../../features/movie/movie.service'
import { getAllShowtimes } from '../../features/showtime/showtime.service'
import { format, addDays, isSameDay } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { Showtime as ShowtimeType } from '../../features/showtime/showtime.type'
import Loading from '../../components/Loading/Loading'
import { cancelActiveHoldingSessions } from '../../features/booking/booking.service'
import { ArrowLeftOutlined, CalendarOutlined, ClockCircleOutlined, VideoCameraOutlined } from '@ant-design/icons'

const ageRatingBadge: Record<string, { label: string; bg: string; color: string }> = {
    P: { label: "P", bg: "#dcfce7", color: "#15803d" },
    K: { label: "K", bg: "#e0f2fe", color: "#0369a1" },
    T13: { label: "13+", bg: "#fef3c7", color: "#b45309" },
    T16: { label: "16+", bg: "#ffedd5", color: "#c2410c" },
    T18: { label: "18+", bg: "#ffe4e6", color: "#be123c" },
    C: { label: "C", bg: "#f3f4f6", color: "#4b5563" },
};

function Showtime() {
    const { movieId } = useParams()
    const navigate = useNavigate()

    useEffect(() => {
        void cancelActiveHoldingSessions()
    }, [])

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
        return <Loading fullScreen text="Đang tải lịch chiếu..." />
    }

    if (movieError || showtimesError || !movie) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 20px', minHeight: '60vh', background: '#f8fafc' }}>
                <p style={{ color: '#e11d48', fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
                    Không thể tải lịch chiếu phim này.
                </p>
                <Link
                    to={`/movies/${movieId}`}
                    style={{
                        padding: '10px 24px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontWeight: 600,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                    }}
                >
                    Quay lại
                </Link>
            </div>
        )
    }

    const filteredShowtimes = showtimes?.filter(st => {
        const stDate = new Date(st.startTime)
        return isSameDay(stDate, selectedDate)
    }) || []

    const groupedShowtimes = filteredShowtimes.reduce((acc, st) => {
        const cinemaId = st.cinema?._id || 'default'
        const formatType = st.format || '2D'

        if (!acc[cinemaId]) {
            acc[cinemaId] = {
                cinemaName: st.cinema?.name || 'Hệ thống rạp Lumora',
                formats: {}
            }
        }
        if (!acc[cinemaId].formats[formatType]) {
            acc[cinemaId].formats[formatType] = []
        }
        acc[cinemaId].formats[formatType].push(st)
        return acc
    }, {} as Record<string, { cinemaName: string; formats: Record<string, ShowtimeType[]> }>)

    const badge = ageRatingBadge[movie.ageRating] || { label: movie.ageRating || 'P', bg: '#f1f5f9', color: '#475569' };

    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
            {/* Header section identical to MovieDetail Light Theme */}
            <div
                style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '40px 20px',
                }}
            >
                <div
                    style={{
                        maxWidth: '1200px',
                        margin: '0 auto',
                        display: 'flex',
                        gap: '40px',
                        width: '100%',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                    }}
                >
                    <div style={{ flex: '0 0 160px' }}>
                        <div
                            style={{
                                borderRadius: '12px',
                                overflow: 'hidden',
                                boxShadow: '0 12px 32px rgba(15,23,42,0.12)',
                                border: '3px solid #ffffff',
                                aspectRatio: '2/3',
                                background: '#e2e8f0'
                            }}
                        >
                            {movie.posterUrl ? (
                                <img
                                    src={movie.posterUrl}
                                    alt={movie.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '40px', color: '#94a3b8' }}>
                                    {movie.title.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ flex: '1 1 400px' }}>
                        <Link
                            to={`/movies/${movie._id}`}
                            style={{
                                color: '#64748b',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                fontWeight: 600,
                                marginBottom: '12px',
                                transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#e11d48'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                        >
                            <ArrowLeftOutlined /> Quay lại Chi tiết phim
                        </Link>
                        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px', lineHeight: 1.2, color: '#0f172a' }}>
                            {movie.title}
                        </h1>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
                            <span
                                style={{
                                    background: badge.bg,
                                    color: badge.color,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                }}
                            >
                                {badge.label}
                            </span>
                            <span style={{ color: '#475569', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                <ClockCircleOutlined /> {movie.duration} phút
                            </span>
                            <span style={{ color: '#cbd5e1' }}>|</span>
                            <span style={{ color: '#475569', fontSize: '14px', fontWeight: 600 }}>
                                {movie.genres?.join(', ') || 'Đang cập nhật'}
                            </span>
                        </div>
                        <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {movie.description}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Showtimes Area */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px 80px' }}>
                
                {/* Date Picker */}
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <CalendarOutlined style={{ fontSize: '24px', color: '#e11d48' }} />
                        <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#0f172a' }}>Chọn Ngày Chiếu</h2>
                    </div>
                    
                    <div 
                        style={{ 
                            display: 'flex', 
                            gap: '12px', 
                            overflowX: 'auto', 
                            paddingBottom: '16px',
                            scrollbarWidth: 'thin',
                            scrollbarColor: '#cbd5e1 transparent'
                        }}
                    >
                        {dates.map((date, idx) => {
                            const active = isSameDay(date, selectedDate)
                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedDate(date)}
                                    type="button"
                                    style={{
                                        flex: '0 0 auto',
                                        minWidth: '90px',
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        border: active ? '2px solid #e11d48' : '1px solid #e2e8f0',
                                        background: active ? '#fff1f2' : '#ffffff',
                                        color: active ? '#e11d48' : '#475569',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        transition: 'all 0.2s',
                                        boxShadow: active ? '0 4px 12px rgba(225,29,72,0.15)' : '0 2px 6px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    <span style={{ fontSize: '13px', fontWeight: active ? 700 : 500, marginBottom: '4px' }}>
                                        {idx === 0 ? 'Hôm nay' : format(date, 'EEEE', { locale: vi })}
                                    </span>
                                    <span style={{ fontSize: '18px', fontWeight: 800 }}>
                                        {format(date, 'dd/MM')}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Showtimes List */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                        <VideoCameraOutlined style={{ fontSize: '24px', color: '#e11d48' }} />
                        <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#0f172a' }}>Lịch Chiếu</h2>
                    </div>

                    {Object.keys(groupedShowtimes).length === 0 ? (
                        <div 
                            style={{ 
                                textAlign: 'center', 
                                padding: '60px 20px', 
                                background: '#ffffff', 
                                borderRadius: '16px', 
                                border: '1px dashed #cbd5e1' 
                            }}
                        >
                            <p style={{ fontSize: '18px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                                Không có suất chiếu nào vào ngày đã chọn.
                            </p>
                            <p style={{ color: '#64748b', fontSize: '14px' }}>
                                Vui lòng chọn một ngày chiếu khác ở trên.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {Object.values(groupedShowtimes).map((cinemaGroup, idx) => (
                                <div 
                                    key={idx} 
                                    style={{
                                        background: '#ffffff',
                                        borderRadius: '16px',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 4px 16px rgba(15,23,42,0.04)',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* Cinema Title */}
                                    <div 
                                        style={{ 
                                            background: '#f8fafc', 
                                            padding: '16px 24px', 
                                            borderBottom: '1px solid #e2e8f0'
                                        }}
                                    >
                                        <h4 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                                            {cinemaGroup.cinemaName}
                                        </h4>
                                    </div>

                                    {/* Formats & Timeslots */}
                                    <div style={{ padding: '24px' }}>
                                        {Object.entries(cinemaGroup.formats).map(([formatType, list], fIdx) => (
                                            <div 
                                                key={formatType} 
                                                style={{ 
                                                    display: 'flex', 
                                                    flexDirection: 'column',
                                                    gap: '16px',
                                                    marginBottom: fIdx !== Object.entries(cinemaGroup.formats).length - 1 ? '24px' : 0
                                                }}
                                            >
                                                {/* Format Badge */}
                                                <div>
                                                    <span 
                                                        style={{
                                                            display: 'inline-block',
                                                            background: '#fff1f2',
                                                            color: '#e11d48',
                                                            border: '1px solid #ffe4e6',
                                                            padding: '4px 12px',
                                                            borderRadius: '6px',
                                                            fontSize: '13px',
                                                            fontWeight: 700,
                                                            letterSpacing: '0.5px'
                                                        }}
                                                    >
                                                        {formatType}
                                                    </span>
                                                </div>

                                                {/* Timeslots Grid */}
                                                <div 
                                                    style={{ 
                                                        display: 'grid', 
                                                        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
                                                        gap: '12px' 
                                                    }}
                                                >
                                                    {list.map((st) => {
                                                        const startHour = format(new Date(st.startTime), 'HH:mm')
                                                        const isPast = new Date(st.startTime) <= new Date()
                                                        return (
                                                            <button
                                                                key={st._id}
                                                                disabled={isPast}
                                                                onClick={() => {
                                                                    if (!isPast) navigate(`/booking/${st._id}`)
                                                                }}
                                                                type="button"
                                                                style={{
                                                                    background: isPast ? '#f1f5f9' : '#ffffff',
                                                                    border: isPast ? '1px dashed #cbd5e1' : '1px solid #e2e8f0',
                                                                    borderRadius: '8px',
                                                                    padding: '12px',
                                                                    cursor: isPast ? 'not-allowed' : 'pointer',
                                                                    opacity: isPast ? 0.6 : 1,
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    transition: 'all 0.2s',
                                                                    boxShadow: isPast ? 'none' : '0 2px 6px rgba(15,23,42,0.02)'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    if (!isPast) {
                                                                        e.currentTarget.style.borderColor = '#e11d48';
                                                                        e.currentTarget.style.background = '#fff1f2';
                                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                                    }
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    if (!isPast) {
                                                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                                                        e.currentTarget.style.background = '#ffffff';
                                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                                    }
                                                                }}
                                                            >
                                                                <span style={{ fontSize: '18px', fontWeight: 800, color: isPast ? '#94a3b8' : '#0f172a', textDecoration: isPast ? 'line-through' : 'none' }}>
                                                                    {startHour}
                                                                </span>
                                                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                                                    {st.room.name}
                                                                </span>
                                                                {isPast ? (
                                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', marginTop: '4px' }}>
                                                                        Đã chiếu
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#ea580c', marginTop: '4px' }}>
                                                                        {st.basePrice.toLocaleString('vi-VN')}đ
                                                                    </span>
                                                                )}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Showtime