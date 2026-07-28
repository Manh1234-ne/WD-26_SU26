import { useEffect, useState, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../features/auth/hooks/useAuth"
import { getBookingsByUser, getBookingById, cancelBooking } from "../../features/booking/booking.service"
import { App as AntdApp, Table, Tag, Modal, Button, Spin, Divider, Space } from "antd"
import { format } from "date-fns"
import { FileOutlined, FilterOutlined, HomeOutlined, EyeOutlined, CloseCircleOutlined, CreditCardOutlined, ClockCircleOutlined } from "@ant-design/icons"
import Loading from "../../components/Loading/Loading"

const CountdownTimer = ({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - new Date().getTime()) / 1000))
      return diff
    }

    setTimeLeft(calculateTimeLeft())

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft()
      setTimeLeft(remaining)
      if (remaining <= 0) {
        clearInterval(timer)
        onExpire()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [expiresAt, onExpire])

  if (timeLeft <= 0) return <span style={{ color: "#ef4444", fontWeight: 700 }}>Hết thời gian thanh toán</span>

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  return (
    <span style={{ color: "#f59e0b", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <ClockCircleOutlined /> Còn {minutes}:{seconds.toString().padStart(2, "0")} để thanh toán
    </span>
  )
}

function BookingHistory() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { message, modal } = AntdApp.useApp()
  const [bookings, setBookings] = useState<any[]>([])
  const [seatCounts, setSeatCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [bookingDetail, setBookingDetail] = useState<any>(null)

  const filteredBookings = useMemo(() => {
    if (!statusFilter) return bookings
    return bookings.filter((b) => b.status === statusFilter)
  }, [bookings, statusFilter])

  const loadBookings = useCallback(async () => {
    if (!user?._id) return
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
  }, [user?._id])

  useEffect(() => {
    if (!user?._id) {
      message.warning("Vui lòng đăng nhập để xem lịch sử đặt vé.")
      navigate("/signIn")
      return
    }

    loadBookings()
  }, [user?._id, navigate, message, loadBookings])

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

  const handleOpenDetails = async (id: string) => {
    setIsModalOpen(true)
    setDetailLoading(true)
    try {
      const res = await getBookingById(id)
      setBookingDetail(res.data)
    } catch (err) {
      console.error("Lỗi lấy chi tiết vé:", err)
      message.error("Không thể tải chi tiết vé.")
      setIsModalOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleCancelBooking = async (id: string) => {
    modal.confirm({
      title: "Xác nhận hủy đặt vé",
      content: "Bạn có chắc chắn muốn hủy đơn đặt vé này không? Hành động này không thể hoàn tác và ghế sẽ được giải phóng.",
      okText: "Hủy vé",
      okType: "danger",
      cancelText: "Quay lại",
      onOk: async () => {
        try {
          await cancelBooking(id)
          message.success("Hủy đặt vé thành công.")
          setIsModalOpen(false)
          loadBookings()
        } catch (err: any) {
          console.error("Lỗi hủy vé:", err)
          message.error(err?.response?.data?.message || "Không thể hủy đặt vé. Vui lòng thử lại sau.")
        }
      }
    })
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
      render: () => "Rạp Lumora",
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
    {
      title: "Hành động",
      key: "action",
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button 
            type="link" 
            icon={<EyeOutlined />} 
            onClick={(e) => {
              e.stopPropagation()
              handleOpenDetails(record.key)
            }}
          >
            Chi tiết
          </Button>
          {record.status === "pending" && (
            <Button
              type="primary"
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/payment/${record.key}`)
              }}
            >
              Thanh toán
            </Button>
          )}
        </Space>
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
          <Loading text="Đang tải lịch sử vé..." />
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
            onRow={(record) => {
              return {
                onClick: () => {
                  handleOpenDetails(record.key)
                },
                style: { cursor: "pointer" }
              }
            }}
            pagination={{ pageSize: 8 }}
            bordered={false}
            size="middle"
            locale={{ emptyText: "Không có dữ liệu" }}
            style={{ width: "100%", borderRadius: "12px" }}
            scroll={{ x: true }}
          />
        </div>
      )}

      <Modal
        title={
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
            <FileOutlined style={{ color: "#e11d48" }} />
            <span>Chi tiết đơn đặt vé</span>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={600}
        centered
        style={{ padding: "12px 0 0 0" }}
      >
        {detailLoading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "300px" }}>
            <Spin size="large" tip="Đang tải chi tiết đơn vé..." />
          </div>
        ) : bookingDetail ? (
          <div>
            <div 
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "20px",
                border: "1px solid #f3d7e1",
                position: "relative",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)"
              }}
            >
              <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                {bookingDetail.booking?.showtime?.movie?.image && (
                  <img 
                    src={bookingDetail.booking.showtime.movie.image} 
                    alt={bookingDetail.booking.showtime.movie.title}
                    style={{ width: "90px", height: "130px", objectFit: "cover", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 6px 0", color: "#111827" }}>
                      {bookingDetail.booking?.showtime?.movie?.title}
                    </h3>
                    <Tag color={
                      bookingDetail.booking.status === "confirmed" || bookingDetail.booking.status === "completed" ? "green" : 
                      bookingDetail.booking.status === "cancelled" ? "red" : "orange"
                    } style={{ fontWeight: 600, borderRadius: "4px", padding: "2px 8px", marginRight: 0 }}>
                      {getStatusLabel(bookingDetail.booking.status)}
                    </Tag>
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", color: "#4b5563", fontSize: "14px", marginTop: "8px" }}>
                    <div><strong>Rạp:</strong> Rạp Lumora ({bookingDetail.booking?.showtime?.room?.name})</div>
                    <div><strong>Suất chiếu:</strong> {bookingDetail.booking?.showtime?.startTime ? formatDateTime(bookingDetail.booking.showtime.startTime) : "-"}</div>
                    <div><strong>Mã đặt vé:</strong> <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#111827" }}>#{bookingDetail.booking?.bookingCode}</span></div>
                  </div>
                </div>
              </div>

              {bookingDetail.booking.status === "pending" && bookingDetail.booking.expiresAt && (
                <div style={{ 
                  background: "#fffbeb", 
                  border: "1px solid #fde68a", 
                  borderRadius: "8px", 
                  padding: "10px 12px", 
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "14px"
                }}>
                  <CountdownTimer 
                    expiresAt={bookingDetail.booking.expiresAt} 
                    onExpire={() => {
                      message.warning("Đơn đặt vé đã hết hạn thanh toán!")
                      setIsModalOpen(false)
                      loadBookings()
                    }} 
                  />
                </div>
              )}

              <Divider style={{ margin: "16px 0", borderStyle: "dashed" }} />

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px", color: "#4b5563" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Ghế đặt ({bookingDetail.seats?.length || 0} ghế):</span>
                  <span style={{ fontWeight: 700, color: "#111827" }}>
                    {bookingDetail.seats?.map((s: any) => s.seatCode).join(", ") || "-"}
                  </span>
                </div>

                {bookingDetail.combos && bookingDetail.combos.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span>Đồ ăn / Nước uống:</span>
                    <div style={{ textAlign: "right", fontWeight: 600, color: "#111827" }}>
                      {bookingDetail.combos.map((item: any) => (
                        <div key={item._id}>
                          {item.combo?.name} (x{item.quantity})
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Divider style={{ margin: "12px 0" }} />

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span>Tiền vé:</span>
                    <span>{bookingDetail.booking.totalSeatPrice?.toLocaleString()} đ</span>
                  </div>
                  
                  {bookingDetail.booking.totalComboPrice > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                      <span>Tiền combo:</span>
                      <span>{bookingDetail.booking.totalComboPrice?.toLocaleString()} đ</span>
                    </div>
                  )}

                  {bookingDetail.booking.discountAmount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#16a34a" }}>
                      <span>Giảm giá (Voucher {bookingDetail.booking.voucher?.code}):</span>
                      <span>-{bookingDetail.booking.discountAmount?.toLocaleString()} đ</span>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 700, color: "#e11d48", marginTop: "4px" }}>
                    <span>Tổng thanh toán:</span>
                    <span>{bookingDetail.booking.finalAmount?.toLocaleString()} đ</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              {bookingDetail.booking.status === "pending" && (
                <>
                  <Button 
                    type="primary" 
                    danger 
                    ghost
                    icon={<CloseCircleOutlined />}
                    onClick={() => handleCancelBooking(bookingDetail.booking._id)}
                  >
                    Hủy đặt vé
                  </Button>
                  <Button 
                    type="primary"
                    icon={<CreditCardOutlined />}
                    onClick={() => {
                      setIsModalOpen(false)
                      navigate(`/payment/${bookingDetail.booking._id}`)
                    }}
                  >
                    Tiếp tục thanh toán
                  </Button>
                </>
              )}
              <Button onClick={() => setIsModalOpen(false)}>Đóng</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default BookingHistory
