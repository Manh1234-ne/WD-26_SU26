import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../features/auth/hooks/useAuth"
import { getBookingsByUser, getBookingById } from "../../features/booking/booking.service"
import { App as AntdApp, Table, Tag } from "antd"
import { format } from "date-fns"
import { FileOutlined, FilterOutlined, HomeOutlined } from "@ant-design/icons"

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

  const columns = [
    {
      title: "Mã hóa đơn",
      dataIndex: "bookingCode",
      key: "bookingCode",
      render: (_: string, record: any) => <strong>#{record.bookingCode}</strong>,
    },
    {
      title: "Phim",
      dataIndex: "movieTitle",
      key: "movieTitle",
      render: (value: string) => value || "-",
    },
    {
      title: "Rạp chiếu",
      dataIndex: "cinemaName",
      key: "cinemaName",
      render: (value: string) => value || "-",
    },
    {
      title: "Suất chiếu",
      dataIndex: "showtime",
      key: "showtime",
      render: (value: string) => value || "-",
    },
    {
      title: "Ghế",
      dataIndex: "seatCount",
      key: "seatCount",
      render: (value: number) => `${value} ghế`,
    },
    {
      title: "Ngày đặt",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: string) => formatDateTime(value),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={status === "confirmed" || status === "completed" ? "green" : status === "cancelled" ? "red" : "orange"}>
          {getStatusLabel(status)}
        </Tag>
      ),
    },
  ]

  const tableData = filteredBookings.map((booking) => ({
    key: booking._id,
    bookingCode: booking.bookingCode,
    movieTitle: booking.showtime?.movie?.title || "-",
    cinemaName: booking.showtime?.cinema?.name || "-",
    showtime: booking.showtime?.startTime ? formatDateTime(booking.showtime.startTime) : "-",
    seatCount: seatCounts[booking._id] ?? 0,
    createdAt: booking.createdAt,
    status: booking.status,
  }))

  return (
    <div className="page-shell booking-history-page">
      <div className="booking-history-header" style={{ background: "linear-gradient(135deg, #fff7f9 0%, #ffffff 100%)", border: "1px solid #f3d7e1", borderRadius: "20px", padding: "24px", boxShadow: "0 8px 24px rgba(225, 29, 72, 0.08)" }}>
        <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <p className="eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#e11d48", fontWeight: 700, marginBottom: "6px" }}><FileOutlined /> Lịch sử đặt vé</p>
            <h2 style={{ margin: 0, fontSize: "28px", color: "#111827" }}>Những đơn vé của bạn</h2>
          </div>
          {!loading && bookings.length > 0 && (
            <div className="booking-count-badge" style={{ background: "#ffe4ea", color: "#be123c", borderRadius: "999px", padding: "8px 14px", fontWeight: 700 }}>
              {bookings.length} vé
            </div>
          )}
        </div>

        {!loading && bookings.length > 0 && (
          <div className="booking-filters" style={{ marginTop: "16px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <span className="filter-label" style={{ color: "#4b5563", fontWeight: 600 }}><FilterOutlined /> Lọc:</span>
            <div className="filter-buttons" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {statusOptions.map((option) => (
                <button
                  key={String(option.value)}
                  className={`filter-btn ${statusFilter === option.value ? "active" : ""}`}
                  onClick={() => setStatusFilter(option.value)}
                  style={{
                    border: statusFilter === option.value ? "1px solid #e11d48" : "1px solid #e5e7eb",
                    background: statusFilter === option.value ? "#e11d48" : "#fff",
                    color: statusFilter === option.value ? "#fff" : "#374151",
                    borderRadius: "999px",
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
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
        <div className="booking-history-list" style={{ marginTop: "20px", background: "#fff", borderRadius: "16px", padding: "8px", boxShadow: "0 6px 20px rgba(0,0,0,0.05)", width: "100%" }}>
          <Table
            columns={columns}
            dataSource={tableData}
            pagination={{ pageSize: 8 }}
            bordered={false}
            size="middle"
            locale={{ emptyText: "Không có dữ liệu" }}
            style={{ width: "100%", borderRadius: "12px" }}
            scroll={{ x: true }}
          />
        </div>
      )}
    </div>
  )
}

export default BookingHistory
