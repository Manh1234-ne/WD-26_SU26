import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../features/auth/hooks/useAuth"
import { getBookingsByUser } from "../../features/booking/booking.service"
import { App as AntdApp } from "antd"
import { format } from "date-fns"

function BookingHistory() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { message } = AntdApp.useApp()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

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
        setBookings(response.data)
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

  const formatDateTime = (value: string) => {
    try {
      return format(new Date(value), "dd/MM/yyyy HH:mm")
    } catch {
      return value
    }
  }

  return (
    <div className="page-shell booking-history-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Lịch sử đặt vé</p>
          <h2>Đơn vé của bạn</h2>
        </div>
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
        </div>
      )}

      {!loading && !error && bookings.length > 0 && (
        <div className="booking-history-list">
          {bookings.map((booking) => (
            <article className="booking-card" key={booking._id}>
              <div className="booking-card-header">
                <div>
                  <p className="booking-card-title">Mã vé: {booking.bookingCode}</p>
                  <p className="booking-card-meta">{getStatusLabel(booking.status)}</p>
                </div>
                <p className="booking-card-date">{formatDateTime(booking.createdAt)}</p>
              </div>

              <div className="booking-card-body">
                <div className="booking-field">
                  <span className="label">Phim</span>
                  <span className="value">{booking.showtime?.movie?.title || "-"}</span>
                </div>
                <div className="booking-field">
                  <span className="label">Rạp / Phòng</span>
                  <span className="value">
                    {booking.showtime?.cinema?.name || "-"} / {booking.showtime?.room?.name || "-"}
                  </span>
                </div>
                <div className="booking-field">
                  <span className="label">Suất chiếu</span>
                  <span className="value">
                    {booking.showtime?.startTime
                      ? formatDateTime(booking.showtime.startTime)
                      : "-"}
                  </span>
                </div>
                <div className="booking-field">
                  <span className="label">Tổng tiền</span>
                  <span className="value">{booking.finalAmount?.toLocaleString("vi-VN")} đ</span>
                </div>
                <div className="booking-field">
                  <span className="label">Voucher</span>
                  <span className="value">{booking.voucher?.code || "Không"}</span>
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
