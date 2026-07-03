import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../features/auth/hooks/useAuth"
import { getBookingsByUser, getBookingById } from "../../features/booking/booking.service"
import { App as AntdApp } from "antd"
import { format } from "date-fns"
import { FileOutlined, CalendarOutlined, DollarOutlined, FilterOutlined, HomeOutlined } from "@ant-design/icons"

function BookingHistory() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { message } = AntdApp.useApp()
  const [bookings, setBookings] = useState<any[]>([])
  const [seatCounts, setSeatCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const filteredBookings = useMemo(() => {
    if (!statusFilter) return bookings
    return bookings.filter((b) => b.status === statusFilter)
  }, [bookings, statusFilter])

  useEffect(() => {
    if (!user?._id) {
      message.warning("Vui lòng đăng nhập để xem lịch sử đặt vé.")
      navigate("/signIn")
      return
    }

    const loadBookings = async () => {
      setLoading(true)
      try {
        const response = await getBookingsByUser(user._id)
        const bookingList = response.data
        setBookings(bookingList)

        const counts = await Promise.all(
          bookingList.map(async (booking: any) => {
            try {
              const detailResponse = await getBookingById(booking._id)
              return [booking._id, Array.isArray(detailResponse.data.seats) ? detailResponse.data.seats.length : 0] as const
            } catch (err) {
              return [booking._id, 0] as const
            }
          })
        )

        setSeatCounts(Object.fromEntries(counts))
        setError("")
      } catch (err: any) {
        console.error("Lỗi tải lịch sử đặt vé:", err)
        setError("Không thể tải lịch sử đặt vé. Vui lòng thử lại sau.")
      } finally {
        setLoading(false)
      }
    }

    loadBookings()
  }, [user, navigate, message])

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Chờ thanh toán"
      case "confirmed":
        return "Đã thanh toán"
      case "completed":
        return "Hoàn tất"
      case "cancelled":
        return "Đã hủy"
      default:
        return status
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "status-badge status-pending"
      case "confirmed":
        return "status-badge status-confirmed"
      case "completed":
        return "status-badge status-completed"
      case "cancelled":
        return "status-badge status-cancelled"
      default:
        return "status-badge"
    }
  }

  const statusOptions = [
    { label: "Tất cả", value: null },
    { label: "Chờ thanh toán", value: "pending" },
    { label: "Đã thanh toán", value: "confirmed" },
    { label: "Hoàn tất", value: "completed" },
    { label: "Đã hủy", value: "cancelled" },
  ]

  const formatDateTime = (value: string) => {
    try {
      return format(new Date(value), "dd/MM/yyyy HH:mm")
    } catch {
      return value
    }
  }

  return (
    <div className="page-shell booking-history-page">
      <div className="booking-history-header">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><FileOutlined /> Lịch sử đặt vé</p>
            <h2>Những đơn vé của bạn</h2>
          </div>
          {!loading && bookings.length > 0 && (
            <div className="booking-count-badge">{bookings.length} vé</div>
          )}
        </div>

        {!loading && bookings.length > 0 && (
          <div className="booking-filters">
            <span className="filter-label"><FilterOutlined /> Lọc:</span>
            <div className="filter-buttons">
              {statusOptions.map((option) => (
                <button
                  key={String(option.value)}
                  className={`filter-btn ${statusFilter === option.value ? "active" : ""}`}
                  onClick={() => setStatusFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="page-state">
          <p className="state-text">Đang tải lịch sử đặt vé...</p>
        </div>
      )}

      {!loading && error && (
        <div className="page-state">
          <p className="state-text error-text">{error}</p>
        </div>
      )}

      {!loading && !error && bookings.length === 0 && (
        <div className="page-state">
          <p className="state-text">Bạn chưa có đơn vé nào.</p>
          <a href="/" className="ghost-button" style={{ marginTop: "16px", display: "inline-block" }}>
            <HomeOutlined /> Quay lại trang chủ
          </a>
        </div>
      )}

      {!loading && !error && bookings.length > 0 && filteredBookings.length === 0 && (
        <div className="page-state">
          <p className="state-text">Không có đơn vé phù hợp với bộ lọc này.</p>
        </div>
      )}

      {!loading && !error && filteredBookings.length > 0 && (
        <div className="booking-history-list">
          {filteredBookings.map((booking) => (
            <article className="booking-card" key={booking._id}>
              <div className="booking-card-header">
                <div className="booking-card-title-section">
                  <div className="booking-code-wrapper">
                    <p className="booking-code">#{booking.bookingCode}</p>
                    <span className={getStatusBadgeClass(booking.status)}>
                      {getStatusLabel(booking.status)}
                    </span>
                  </div>
                  <p className="booking-movie">{booking.showtime?.movie?.title || "-"}</p>
                  <p className="booking-seat-count">
                    Số ghế: {seatCounts[booking._id] ?? 0}
                  </p>
                </div>
                <p className="booking-date"><CalendarOutlined /> {formatDateTime(booking.createdAt)}</p>
              </div>

              <div className="booking-card-body">
                <div className="booking-field-row">
                  <div className="booking-field">
                    <span className="label">Suất chiếu</span>
                    <span className="value">
                      {booking.showtime?.startTime
                        ? formatDateTime(booking.showtime.startTime)
                        : "-"}
                    </span>
                  </div>
                  <div className="booking-field">
                    <span className="label">Định dạng</span>
                    <span className="value">{booking.showtime?.format || "2D"}</span>
                  </div>
                </div>

                <div className="booking-field-row booking-price-row">
                  <div className="booking-field">
                    <span className="label">Voucher</span>
                    <span className="value">{booking.voucher?.code ? `${booking.voucher.code} (-${booking.voucher.discount}%)` : "Không"}</span>
                  </div>
                  <div className="booking-field">
                    <span className="label"><DollarOutlined /> Tổng tiền</span>
                    <span className="value price">{booking.finalAmount?.toLocaleString("vi-VN")} đ</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default BookingHistory
