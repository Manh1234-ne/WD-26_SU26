import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getShowtimeById } from '../../features/showtime/showtime.service'
import { getSeatsByRoom } from '../../features/seat/seat.service'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { api } from '../../services/api'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { App as AntdApp } from 'antd'
import Swal from 'sweetalert2'

interface Seat {
    _id: string
    code: string
    row: string
    number: number
    type: 'standard' | 'vip' | 'couple' | 'disabled'
    priceMultiplier: number
    isActive: boolean
}

function SeatSelection() {
    const { showtimeId } = useParams()
    const navigate = useNavigate()
    const { user, isAuthenticated } = useAuth()
    const { message } = AntdApp.useApp()
    const [selectedSeats, setSelectedSeats] = useState<Seat[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)


    useEffect(() => {
        if (!isAuthenticated) {
            message.warning('Vui lòng đăng nhập để tiến hành đặt vé.')
            navigate('/signIn')
        }
    }, [isAuthenticated, navigate, message])

    const { data: showtime, isLoading: isShowtimeLoading, error: showtimeError } = useQuery({
        queryKey: ['showtime-detail', showtimeId],
        queryFn: () => getShowtimeById(showtimeId || ''),
        enabled: !!showtimeId,
    })

    const roomId = showtime?.room?._id


    const { data: seatData, isLoading: isSeatsLoading, error: seatsError } = useQuery({
        queryKey: ['seats-room', roomId],
        queryFn: () => getSeatsByRoom(roomId || ''),
        enabled: !!roomId,
    })

    const { data: occupiedSeats, isLoading: isOccupiedLoading, refetch: refetchOccupied } = useQuery({
        queryKey: ['occupied-seats', showtimeId],
        queryFn: async () => {
            const res = await api.get(`/booking-seats/showtime/${showtimeId}/occupied`)
            return res.data.data
        },
        enabled: !!showtimeId,
    })

    if (isShowtimeLoading || isSeatsLoading || isOccupiedLoading) {
        return (
            <div className="page-state">
                <p className="state-text">Đang tải phòng chiếu và sơ đồ ghế...</p>
            </div>
        )
    }

    if (showtimeError || seatsError || !showtime || !seatData) {
        return (
            <div className="page-state">
                <p className="state-text error-text">Không thể tải thông tin phòng chiếu.</p>
                <Link className="ghost-button" to="/">
                    Quay lại Trang chủ
                </Link>
            </div>
        )
    }

    const seats = seatData.seats || []
    const occupiedSet = new Set(occupiedSeats?.map((os: any) => os.seat) || [])

    const groupedSeats = seats.reduce((acc, seat) => {
        if (!seat.isActive) return acc
        if (!acc[seat.row]) {
            acc[seat.row] = []
        }
        acc[seat.row].push(seat)
        return acc
    }, {} as Record<string, Seat[]>)

    Object.keys(groupedSeats).forEach((row) => {
        groupedSeats[row].sort((a, b) => a.number - b.number)
    })


    const sortedRows = Object.keys(groupedSeats).sort()

    const toggleSeat = (seat: Seat) => {
        if (occupiedSet.has(seat._id)) return

        if (selectedSeats.some((s) => s._id === seat._id)) {
            setSelectedSeats(selectedSeats.filter((s) => s._id !== seat._id))
        } else {
            if (selectedSeats.length >= 8) {
                message.warning('Bạn chỉ được chọn tối đa 8 ghế trong một lượt đặt.')
                return
            }
            setSelectedSeats([...selectedSeats, seat])
        }
    }

    const totalSeatPrice = selectedSeats.reduce((sum, seat) => {
        return sum + showtime.basePrice * seat.priceMultiplier
    }, 0)

    const handleBookingSubmit = async () => {
        if (selectedSeats.length === 0) {
            message.error('Vui lòng chọn ít nhất một ghế để tiếp tục.')
            return
        }

        setIsSubmitting(true)
        try {
            const payload = {
                user: user?._id || user?._id,
                showtime: showtimeId,
                seatIds: selectedSeats.map((s) => s._id),
            }

            const res = await api.post('/bookings', payload)

            Swal.fire({
                title: 'Đặt Vé Thành Công!',
                html: `
          <div style="text-align: left; padding: 10px 0;">
            <p>Cảm ơn bạn đã lựa chọn dịch vụ của chúng tôi.</p>
            <p><strong>Mã vé:</strong> <span style="color: #e11d48; font-size: 18px; font-weight: 800;">${res.data.data.bookingCode}</span></p>
            <p><strong>Phim:</strong> ${showtime.movie.title}</p>
            <p><strong>Ghế:</strong> ${selectedSeats.map((s) => s.code).join(', ')}</p>
            <p><strong>Phòng:</strong> ${showtime.room.name}</p>
            <p><strong>Tổng tiền:</strong> ${totalSeatPrice.toLocaleString('vi-VN')} đ</p>
          </div>
        `,
                icon: 'success',
                confirmButtonColor: '#e11d48',
                confirmButtonText: 'Đồng ý',
            }).then(() => {
                navigate('/')
            })
        } catch (err: any) {
            console.error(err)
            const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra trong quá trình giữ ghế.'
            Swal.fire({
                title: 'Đặt Vé Thất Bại',
                text: errorMsg,
                icon: 'error',
                confirmButtonColor: '#e11d48',
            })
            refetchOccupied()
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="seat-selection-page">

            <div className="seat-layout-panel">
                <div className="screen-container">
                    <div className="screen-line" />
                    <span className="screen-text">MÀN HÌNH</span>
                </div>

                <div className="seats-area-wrapper">
                    <div className="seats-rows-grid">
                        {sortedRows.map((row) => (
                            <div key={row} className="seat-row-line">
                                <span className="row-label">{row}</span>
                                {groupedSeats[row].map((seat) => {
                                    const isOccupied = occupiedSet.has(seat._id)
                                    const isSelected = selectedSeats.some((s) => s._id === seat._id)

                                    return (
                                        <button
                                            key={seat._id}
                                            className={`seat-unit ${seat.type} ${isOccupied ? 'occupied' : ''} ${isSelected ? 'selected' : ''
                                                }`}
                                            onClick={() => toggleSeat(seat)}
                                            disabled={isOccupied}
                                            title={`${seat.code} (${seat.type}) - ${(showtime.basePrice * seat.priceMultiplier).toLocaleString()}đ`}
                                            type="button"
                                        >
                                            {seat.number}
                                        </button>
                                    )
                                })}
                                <span className="row-label">{row}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="seat-legend-bar">
                    <div className="legend-item">
                        <span className="legend-box standard" />
                        <span>Thường</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-box vip" />
                        <span>VIP</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-box couple" />
                        <span>Couple</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-box selected" />
                        <span>Đang chọn</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-box occupied" />
                        <span>Đã bán</span>
                    </div>
                </div>
            </div>

            <div className="booking-summary-panel">
                <h3 className="summary-movie-title">{showtime.movie.title}</h3>

                <div className="summary-info-list">
                    <div className="summary-info-item">
                        <span className="label">Rạp chiếu</span>
                        <span className="val">{showtime.cinema.name}</span>
                    </div>
                    <div className="summary-info-item">
                        <span className="label">Phòng chiếu</span>
                        <span className="val">{showtime.room.name}</span>
                    </div>
                    <div className="summary-info-item">
                        <span className="label">Định dạng</span>
                        <span className="val">{showtime.format}</span>
                    </div>
                    <div className="summary-info-item">
                        <span className="label">Ngày chiếu</span>
                        <span className="val">{format(new Date(showtime.startTime), 'dd/MM/yyyy')}</span>
                    </div>
                    <div className="summary-info-item">
                        <span className="label">Suất chiếu</span>
                        <span className="val">{format(new Date(showtime.startTime), 'HH:mm')}</span>
                    </div>
                    <div className="summary-info-item">
                        <span className="label">Ghế đã chọn</span>
                        <span className="val" style={{ color: '#e11d48', fontWeight: 800 }}>
                            {selectedSeats.length > 0 ? selectedSeats.map((s) => s.code).join(', ') : 'Chưa chọn'}
                        </span>
                    </div>
                </div>

                <div className="summary-total-price">
                    <span className="label">Tổng tiền</span>
                    <span className="val">{totalSeatPrice.toLocaleString('vi-VN')} đ</span>
                </div>

                <button
                    className="primary-button summary-checkout-btn"
                    disabled={selectedSeats.length === 0 || isSubmitting}
                    onClick={handleBookingSubmit}
                    type="button"
                >
                    {isSubmitting ? 'Đang đặt vé...' : 'Tiến Hành Đặt Vé'}
                </button>

                <Link
                    className="ghost-button"
                    style={{ marginTop: '12px', display: 'inline-flex', width: '100%', alignItems: 'center', justifyContent: 'center' }}
                    to={`/movies/${showtime.movie._id}/showtimes`}
                >
                    Đổi suất chiếu khác
                </Link>
            </div>
        </div>
    )
}

export default SeatSelection