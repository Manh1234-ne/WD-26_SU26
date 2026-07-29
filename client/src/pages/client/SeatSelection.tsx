import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getShowtimeById } from '../../features/showtime/showtime.service'
import { getSeatsByRoom } from '../../features/seat/seat.service'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { api } from '../../services/api'
import { format } from 'date-fns'
import { App as AntdApp } from 'antd'
import Swal from 'sweetalert2'
import Loading from '../../components/Loading/Loading'
import { cancelBooking, getBookingsByUser, getBookingById, createBooking, updateBookingSeats } from '../../features/booking/booking.service'
import { ClockCircleOutlined } from '@ant-design/icons'

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

    const SESSION_KEY = `cinema_holding_${showtimeId}`;
    const [holdingSession, setHoldingSession] = useState<{ bookingId: string; expiresAt: number } | null>(null);

    const [holdingTimeLeft, setHoldingTimeLeft] = useState<number | null>(null)
    const holdingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
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

    useEffect(() => {
        if (!isAuthenticated) {
            message.warning('Vui lòng đăng nhập để tiến hành đặt vé.')
            navigate('/signIn')
        }
    }, [isAuthenticated, navigate, message])

    useEffect(() => {
        if (!showtimeId) return;
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) {
            try {
                const parsed = JSON.parse(raw) as { bookingId: string, expiresAt: number };
                if (Date.now() < parsed.expiresAt) {
                    setHoldingSession(parsed);
                }
                else {
                    sessionStorage.removeItem(SESSION_KEY)
                }
            } catch {
                sessionStorage.removeItem(SESSION_KEY)
            }
        }
    }, [showtimeId, SESSION_KEY]);

    useEffect(() => {
        if (!holdingSession) return
        const tick = () => {
            const remaining = Math.max(0, Math.floor((holdingSession.expiresAt - Date.now()) / 1000))
            setHoldingTimeLeft(remaining)
            if (remaining <= 0) {
                if (holdingTimerRef.current) clearInterval(holdingTimerRef.current)
                
                const expiredBookingId = holdingSession.bookingId
                
                setHoldingSession(null)
                setHoldingTimeLeft(null)
                setSelectedSeats([])
                sessionStorage.removeItem(SESSION_KEY)

                cancelBooking(expiredBookingId)
                    .then(() => {
                        void refetchOccupied()
                    })
                    .catch((err) => {
                        console.error("Error auto-cancelling expired booking on client:", err)
                        void refetchOccupied()
                    })

                Swal.fire({
                    title: 'Hết thời gian giữ chỗ',
                    text: 'Phần giữ ghế của bạn đã hết hạn. Vui lòng chọn lại ghế.',
                    icon: 'warning',
                    confirmButtonColor: '#e11d48',
                })
            }
        }
        tick()
        holdingTimerRef.current = setInterval(tick, 1000)
        return () => {
            if (holdingTimerRef.current) clearInterval(holdingTimerRef.current)
        }
    }, [holdingSession, SESSION_KEY, refetchOccupied]);

    useEffect(() => {
        if (!showtimeId || !user?._id) return;

        const cancelExistingPendingBooking = async () => {
            const raw = sessionStorage.getItem(SESSION_KEY);
            let keepBookingId: string | null = null;
            if (raw) {
                try {
                    const parsed = JSON.parse(raw) as { bookingId: string; expiresAt: number }
                    if (parsed.expiresAt > Date.now()) {
                        keepBookingId = parsed.bookingId
                    }
                } catch { }
            }
            try {
                const res = await getBookingsByUser(user._id)
                const pendingBookings = (res?.data || []).filter((b: any) => {
                    const bShowtimeId = typeof b.showtime === 'object' ? b.showtime?._id : b.showtime;
                    return bShowtimeId === showtimeId && b.status === "pending";
                })
                for (const pb of pendingBookings) {
                    if (pb._id === keepBookingId) continue
                    await cancelBooking(pb._id)
                }
                void refetchOccupied()
            } catch (error) {
                console.error('Error cancelling pending booking on seat selection page:', error)
            }
        }
        void cancelExistingPendingBooking()
    }, [showtimeId, user?._id, SESSION_KEY, refetchOccupied])

    useEffect(() => {
        if (!holdingSession?.bookingId || !seatData?.seats) return;
        let isMounted = true;
        const restoreHoldingSeats = async () => {
            try {
                const res = await getBookingById(holdingSession.bookingId);
                if (!isMounted) return;

                const booking = res?.data?.booking;
                if (booking && booking.status !== "pending") {
                    sessionStorage.removeItem(SESSION_KEY);
                    setHoldingSession(null);
                    setHoldingTimeLeft(null);
                    setSelectedSeats([]);
                    return;
                }

                const bookingSeats = res?.data?.seats || [];
                const holdingSeatIds = new Set(bookingSeats.map((bs: any) => typeof bs.seat === 'object' ? bs.seat._id : bs.seat));
                const restored = (seatData.seats as Seat[]).filter((s) => holdingSeatIds.has(s._id));
                if (restored.length > 0) {
                    setSelectedSeats(restored);
                }
            } catch (error) {
                console.error("Failed to restore holding seats:", error);
                sessionStorage.removeItem(SESSION_KEY);
                setHoldingSession(null);
                setHoldingTimeLeft(null);
                setSelectedSeats([]);
            }
        };
        void restoreHoldingSeats();
        return () => {
            isMounted = false;
        };
    }, [holdingSession?.bookingId, seatData]);

    if (isShowtimeLoading || isSeatsLoading || isOccupiedLoading) {
        return <Loading fullScreen text="Đang tải phòng chiếu và sơ đồ ghế..." />
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
    const occupiedSet = new Set<string>(
        (occupiedSeats || [])
            .filter((os: any) => {
                const osBookingId = typeof os.booking === 'object' ? os.booking?._id : os.booking;
                return !holdingSession?.bookingId || osBookingId !== holdingSession.bookingId;
            })
            .map((os: any) => typeof os.seat === 'object' ? os.seat._id : os.seat)
    )

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

    const hasIsolatedSeat = (rowSeats: Seat[], occupied: Set<string>, selected: Set<string>) => {
        const states = rowSeats.map((s) => {
            if (occupied.has(s._id)) return 'used'
            if (selected.has(s._id)) return 'used'
            return 'empty'
        })
        for (let i = 0; i < states.length; i++) {
            if (
                states[i] === 'empty' &&
                i > 0 &&
                i < states.length - 1 &&
                states[i - 1] === 'used' &&
                states[i + 1] === 'used'
            ) {
                return true
            }
        }
        return false
    }

    const checkAllRowsForIsolation = (selected: Seat[]) => {
        const selectedSet = new Set<string>(selected.map((s) => s._id))
        return Object.values(groupedSeats).some((rowSeats) =>
            hasIsolatedSeat(rowSeats, occupiedSet, selectedSet)
        )
    }

    const toggleSeat = async (seat: Seat) => {
        if (occupiedSet.has(seat._id)) return

        const isAlreadySelected = selectedSeats.some((s) => s._id === seat._id)
        const newSelected = isAlreadySelected
            ? selectedSeats.filter((s) => s._id !== seat._id)
            : [...selectedSeats, seat]

        if (!isAlreadySelected && selectedSeats.length >= 8) {
            Swal.fire({
                title: "Thông báo",
                text: "Bạn chỉ được chọn tối đa 8 ghế trong một lần đặt.",
                icon: "warning",
                confirmButtonColor: "#e11d48"
            })
            return
        }

        if (checkAllRowsForIsolation(newSelected)) {
            Swal.fire({
                title: "Thông báo",
                text: "Việc chọn vị trí ghế của bạn không được để trống 1 ghế ở bên trái, giữa hoặc bên phải trên cùng hàng ghế mà bạn vừa chọn.",
                icon: "warning",
                confirmButtonColor: "#e11d48"
            })
            return
        }

        try {
console.log("HOLDING SESSION:", holdingSession);
            if (!holdingSession) {

                const payload = {
                    user: user?._id,
                    showtime: showtimeId,
                    seatIds: newSelected.map(s => s._id),
                };

                const res = await createBooking(payload);

                const booking = res.data;

                const session = {
                    bookingId: booking._id,
                    expiresAt: new Date(booking.expiresAt).getTime(),
                };

                sessionStorage.setItem(
                    SESSION_KEY,
                    JSON.stringify(session)
                );

                setHoldingSession(session);

            } else {

                // Nếu bỏ hết ghế thì hủy booking luôn
                if (newSelected.length === 0) {
                    await cancelBooking(holdingSession.bookingId);

                    sessionStorage.removeItem(SESSION_KEY);
                    setHoldingSession(null);
                    setSelectedSeats([]);

                    await refetchOccupied();
                    return;
                }

                const res = await updateBookingSeats(
                    holdingSession.bookingId,
                    newSelected.map(s => s._id)
                );

                console.log("Booking trả về:", res.data);

                const session = {
                    bookingId: holdingSession.bookingId,
                    expiresAt: new Date(res.data.expiresAt).getTime(),
                };

                sessionStorage.setItem(
                    SESSION_KEY,
                    JSON.stringify(session)
                );

                setHoldingSession(session);
            }

            setSelectedSeats(newSelected);

            await refetchOccupied();

        } catch (err: any) {

            Swal.fire({
                icon: "error",
                title: "Không thể giữ ghế",
                text:
                    err.response?.data?.message ||
                    "Có lỗi xảy ra"
            });

            await refetchOccupied();
        }
    }

    const totalSeatPrice = selectedSeats.reduce((sum, seat) => {
        return sum + showtime.basePrice * seat.priceMultiplier
    }, 0)

    const handleSingleSeat = (
        seat: Seat[],
        occupied: Set<string>,
        selected: Set<string>
    ) => {
        return hasIsolatedSeat(seat, occupied, selected)
    }

    const formatCountdown = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    const handleBookingSubmit = async () => {
        if (selectedSeats.length === 0) {
            message.error("Vui lòng chọn ghế");
            return;
        }

        if (!holdingSession?.bookingId) {
            message.error("Không tìm thấy phiên giữ ghế");
            return;
        }

        navigate(`/payment/${holdingSession.bookingId}`);
    }

    return (
        <div className="seat-selection-page">

            <div className="seat-layout-panel">
                <div className="screen-container">
                    <div className="screen-line" />
                    <span className="screen-text">MÀN HÌNH</span>
                </div>

                <div className="seats-area-wrapper">
                    <div className="seats-rows-grid" >
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

                {/* Countdown timer */}
                {holdingTimeLeft !== null && holdingTimeLeft >= 0 && (
                    <div
                        className={holdingTimeLeft <= 60 ? 'holding-timer-urgent' : ''}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: holdingTimeLeft <= 60 ? 'linear-gradient(135deg,#fff1f2,#ffe4e6)' : 'linear-gradient(135deg,#ecfdf5,#d1fae5)',
                            border: `1px solid ${holdingTimeLeft <= 60 ? '#fca5a5' : '#6ee7b7'}`,
                            borderRadius: '10px',
                            padding: '10px 14px',
                            marginBottom: '12px',
                            transition: 'background 0.5s, border-color 0.5s',
                        }}>
                        <ClockCircleOutlined style={{ fontSize: '18px', color: holdingTimeLeft <= 60 ? '#e11d48' : '#059669', flexShrink: 0 }} />
                        <div>
                            <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thời gian giữ ghế</div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: holdingTimeLeft <= 60 ? '#e11d48' : '#059669', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                                {formatCountdown(holdingTimeLeft)}
                            </div>
                        </div>
                    </div>
                )}

                <div className="summary-total-price">
                    <span className="label">Tổng tiền</span>
                    <span className="val">{totalSeatPrice.toLocaleString('vi-VN')} đ</span>
                </div>

                <button
                    className="primary-button summary-checkout-btn"
                    disabled={selectedSeats.length === 0 || handleSingleSeat(seats, occupiedSet, new Set(selectedSeats.map(s => s._id))) || isSubmitting}
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
