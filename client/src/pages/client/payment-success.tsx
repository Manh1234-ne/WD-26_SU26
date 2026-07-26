import { useEffect, useState } from "react"
import { useSearchParams, Link, useNavigate } from "react-router-dom"
import { verifyVnPayReturn } from "../../features/payment/payment.service"
import { getBookingById } from "../../features/booking/booking.service"
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    MailOutlined,
    HomeOutlined,
    HistoryOutlined
} from "@ant-design/icons"
import { format } from "date-fns"
import { App as AntdApp } from "antd"
import Loading from "../../components/Loading/Loading"
function PaymentSuccess() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { message } = AntdApp.useApp()
    const [loading, setLoading] = useState(true)
    const [paymentStatus, setPaymentStatus] = useState<"success" | "fail">("fail")
    const [booking, setBooking] = useState<any>(null)
    const [seats, setSeats] = useState<any[]>([])
    useEffect(() => {
        const handleVerify = async () => {

            const vnpResponseCode = searchParams.get("vnp_ResponseCode")
            const vnpTxnRef = searchParams.get("vnp_TxnRef")
            if (vnpResponseCode && vnpTxnRef) {
                try {

                    const params: Record<string, string> = {}
                    searchParams.forEach((value, key) => {
                        params[key] = value
                    })
                    const res = await verifyVnPayReturn(params)
                    if (res.success && res.data?.payment?.status === "paid") {
                        setPaymentStatus("success")

                        const bookingRes = await getBookingById(res.data.booking._id)
                        setBooking(bookingRes.data.booking)
                        setSeats(bookingRes.data.seats)
                    } else {
                        setPaymentStatus("fail")
                        if (res.data?.booking?._id) {
                            const bookingRes = await getBookingById(res.data.booking._id)
                            setBooking(bookingRes.data.booking)
                        }
                    }
                } catch (err) {
                    console.error("Error verifying VNPay payment:", err)
                    setPaymentStatus("fail")
                    message.error("Xác minh giao dịch VNPay thất bại.")
                } finally {
                    setLoading(false)
                }
                return
            }

            const momoStatus = searchParams.get("status")
            const momoBookingId = searchParams.get("bookingId")
            if (momoStatus && momoBookingId) {
                try {
                    const bookingRes = await getBookingById(momoBookingId)
                    setBooking(bookingRes.data.booking)
                    setSeats(bookingRes.data.seats)
                    if (momoStatus === "success") {
                        setPaymentStatus("success")
                    } else {
                        setPaymentStatus("fail")
                    }
                } catch (err) {
                    console.error("Error loading MoMo booking:", err)
                    setPaymentStatus("fail")
                } finally {
                    setLoading(false)
                }
                return
            }

            message.warning("Không tìm thấy thông tin giao dịch.")
            navigate("/")
        }
        handleVerify()
    }, [searchParams, navigate, message])
    if (loading) {
        return (
            <Loading text="Đang kiểm tra và xác thực giao dịch thanh toán..." />
        )
    }
    const showtime = booking?.showtime
    const movie = showtime?.movie
    const room = showtime?.room
    return (
        <div className="payment-result-card">
            {paymentStatus === "success" ? (

                <>
                    <div className="result-status-icon-wrapper success">
                        <CheckCircleOutlined className="result-status-icon" />
                    </div>

                    <h1 className="result-title">Thanh Toán Thành Công!</h1>
                    <p className="result-subtitle">
                        Cảm ơn bạn đã sử dụng dịch vụ của Lumora Cinema. Giao dịch đã được hoàn tất.
                    </p>
                    <div className="result-ticket-details">
                        <div style={{ fontWeight: 800, fontSize: "16px", color: "#0f172a", marginBottom: "16px", borderBottom: "1px dashed #cbd5e1", paddingBottom: "10px" }}>
                            THÔNG TIN ĐƠN VÉ
                        </div>
                        <div className="result-detail-row">
                            <span className="result-detail-label">Tên phim:</span>
                            <span className="result-detail-val" style={{ color: "#e11d48" }}>{movie?.title}</span>
                        </div>
                        <div className="result-detail-row">
                            <span className="result-detail-label">Rạp chiếu:</span>
                            <span className="result-detail-val">Rạp Lumora</span>
                        </div>
                        <div className="result-detail-row">
                            <span className="result-detail-label">Phòng chiếu:</span>
                            <span className="result-detail-val">{room?.name} ({showtime?.format})</span>
                        </div>
                        <div className="result-detail-row">
                            <span className="result-detail-label">Suất chiếu:</span>
                            <span className="result-detail-val">
                                {showtime?.startTime ? `${format(new Date(showtime.startTime), "HH:mm")} - ${format(new Date(showtime.startTime), "dd/MM/yyyy")}` : ""}
                            </span>
                        </div>
                        <div className="result-detail-row">
                            <span className="result-detail-label">Ghế đã chọn:</span>
                            <span className="result-detail-val" style={{ color: "#e11d48" }}>
                                {seats.map((s: any) => s.seatCode).join(", ")}
                            </span>
                        </div>
                        <div className="result-detail-row">
                            <span className="result-detail-label">Mã đặt vé (Booking Code):</span>
                            <span className="result-detail-val" style={{ fontFamily: "monospace", fontSize: "14px" }}>
                                {booking?.bookingCode}
                            </span>
                        </div>
                        <div className="result-detail-row">
                            <span className="result-detail-label">Tổng tiền đã trả:</span>
                            <span className="result-detail-val highlight">
                                {booking?.finalAmount?.toLocaleString("vi-VN")} đ
                            </span>
                        </div>
                    </div>
                    <div className="result-email-banner">
                        <MailOutlined />
                        <span>Mã vé và QR Code đã được gửi tới email: <strong>{booking?.user?.email}</strong></span>
                    </div>
                    <div className="result-actions">
                        <Link className="ghost-button" to="/" style={{ display: "inline-flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                            <HomeOutlined /> Trang chủ
                        </Link>
                        <Link className="primary-button" to="/booking-history" style={{ display: "inline-flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                            <HistoryOutlined /> Lịch sử đặt vé
                        </Link>
                    </div>
                </>
            ) : (
                <>
                    <div className="result-status-icon-wrapper fail">
                        <CloseCircleOutlined className="result-status-icon" />
                    </div>
                    <h1 className="result-title">Thanh Toán Thất Bại</h1>
                    <p className="result-subtitle" style={{ marginBottom: "24px" }}>
                        Giao dịch thanh toán không thành công. Suất chiếu và ghế đã chọn đã được hủy giữ chỗ.
                    </p>
                    {booking && (
                        <div className="result-ticket-details" style={{ borderColor: "#fecdd3", background: "#fff5f5" }}>
                            <div className="result-detail-row">
                                <span className="result-detail-label">Mã vé giữ chỗ:</span>
                                <span className="result-detail-val">{booking.bookingCode}</span>
                            </div>
                            <div className="result-detail-row">
                                <span className="result-detail-label">Phim:</span>
                                <span className="result-detail-val">{movie?.title}</span>
                            </div>
                            <div className="result-detail-row">
                                <span className="result-detail-label">Tổng tiền:</span>
                                <span className="result-detail-val">{booking.finalAmount?.toLocaleString("vi-VN")} đ</span>
                            </div>
                        </div>
                    )}
                    <div className="result-actions">
                        <Link className="ghost-button" to="/" style={{ display: "inline-flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                            <HomeOutlined /> Trang chủ
                        </Link>
                        {booking && booking.status === "pending" && (
                            <Link className="primary-button" to={`/payment/${booking._id}`} style={{ display: "inline-flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                                Thử thanh toán lại
                            </Link>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
export default PaymentSuccess