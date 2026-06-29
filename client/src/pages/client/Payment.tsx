import { useNavigate, useParams, Link } from "react-router-dom"
import { App as antdApp } from "antd"
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBookingById } from "../../features/booking/booking.service";
import Swal from "sweetalert2";
import { createMockMomoPayment, createVnPayUrl } from "../../features/payment/payment.service";
import { ArrowLeftOutlined, ClockCircleOutlined, SafetyCertificateOutlined, VideoCameraOutlined, WalletOutlined } from "@ant-design/icons";
import { format } from "date-fns";



function Payment() {
    const nav = useNavigate();
    const { bookingId } = useParams();
    const { message } = antdApp.useApp();

    const [paymentMethod, setPaymentMethod] = useState<"momo" | "vnpay">("momo");
    const [isProcessing, setIsProcessing] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);


    const { data: responseData, isLoading, error } = useQuery({
        queryKey: ["booking", bookingId],
        queryFn: () => getBookingById(bookingId!),
        enabled: !!bookingId
    });

    const bookingData = responseData?.data as any
    const booking = bookingData?.booking
    const seats = bookingData?.seats || []


    useEffect(() => {
        if (!booking || booking.status !== "pending") return
        const calculateTimeLeft = () => {
            const expiresAt = new Date(booking.expiresAt).getTime()
            const now = new Date().getTime()
            const diff = Math.max(0, Math.floor((expiresAt - now) / 1000))
            return diff
        }
        const initialTime = calculateTimeLeft()
        setTimeLeft(initialTime)
        if (initialTime <= 0) {
            handleExpiration()
            return
        }
        const timer = setInterval(() => {
            const remaining = calculateTimeLeft()
            setTimeLeft(remaining)
            if (remaining <= 0) {
                clearInterval(timer)
                handleExpiration()
            }
        }, 1000)
        return () => clearInterval(timer)
    }, [booking])

    const handleExpiration = () => {
        try {

        } catch (error) {
            console.error("Error cancelling expired booking:", error)
        }
        Swal.fire({
            title: "hết thời gian thanh toán",
            text: "Đặt vé của bạn đã hết hạn",
            icon: "warning",
            confirmButtonColor: "#e11d48",
            confirmButtonText: "Đồng ý",
        }).then(() => {
            nav('/')
        })
    }


    const formaTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSecond = seconds % 60;
        return `${minutes}:${remainingSecond.toString().padStart(2, "0")}`
    }

    const handlePayment = async () => {
        if (!bookingId || !booking) return;

        setIsProcessing(true);
        try {
            if (paymentMethod === "vnpay") {
                const res = await createVnPayUrl(bookingId)
                if (res.success && res.data.paymentUrl) {
                    window.location.href = res.data.paymentUrl
                } else {
                    throw new Error("Không lấy được link thanh toán VNPay")
                }
            } else {
                const res = await createMockMomoPayment(bookingId)
                if (res.success && res.data.payUrl) {
                    window.location.href = res.data.payUrl
                } else {
                    throw new Error("Không lấy được link thanh toán MoMo")
                }
            }
        } catch (error) {
            console.error(error)
            message.error(error?.message || "Có lỗi xảy ra khi khởi tạo giao dịch thanh toán.")
            setIsProcessing(false)
        }
    }
    if (isLoading) {
        return (
            <div className="page-state">
                <p className="state-text">Đang tải hóa đơn đặt vé...</p>
            </div>
        )
    }
    if (error || !booking) {
        return (
            <div className="page-state">
                <p className="state-text error-text">Không tìm thấy thông tin đặt vé hoặc vé đã hết hạn.</p>
                <Link className="ghost-button" to="/">
                    Quay lại Trang chủ
                </Link>
            </div>
        )
    }

    if (booking.status === "confirmed" || booking.status === "completed") {
        return (
            <div className="page-state">
                <p className="state-text">Đặt vé này đã được thanh toán thành công.</p>
                <Link className="primary-button" to={`/payment-success?status=success&bookingId=${booking._id}`}>
                    Xem thông tin vé
                </Link>
            </div>
        )
    }
    const showtime = booking.showtime
    const movie = showtime?.movie
    const cinema = showtime?.cinema
    const room = showtime?.room

    return (
        <div className="payment-page-container">

            <div className="payment-panel">
                <h2 className="payment-title">
                    <WalletOutlined style={{ color: "#e11d48" }} />
                    Chọn Phương Thức Thanh Toán
                </h2>
                {timeLeft !== null && (
                    <div className="payment-timer-banner">
                        <span className="payment-timer-label">
                            <ClockCircleOutlined />
                            Thời gian giữ ghế còn lại:
                        </span>
                        <span className="payment-timer-countdown">{formaTime(timeLeft)}</span>
                    </div>
                )}
                <div className="payment-methods-list">

                    <div
                        className={`payment-method-item vnpay ${paymentMethod === "vnpay" ? "selected" : ""}`}
                        onClick={() => setPaymentMethod("vnpay")}
                    >
                        <div className="payment-method-radio" />
                        <div className="payment-method-logo-wrapper">

                            <svg viewBox="0 0 100 30" className="payment-method-logo" width="40">
                                <path fill="#005baa" d="M8 5h6.5l-4.5 17H3.5L8 5z" />
                                <path fill="#e11d48" d="M12.5 5h6.5L14.5 22h-6.5l4.5-17z" />
                                <text x="21" y="20" fill="#005baa" fontWeight="900" fontSize="13" fontFamily="Arial, Helvetica">VNPAY</text>
                            </svg>
                        </div>
                        <div className="payment-method-details">
                            <div className="payment-method-name">Cổng thanh toán VNPay</div>
                            <div className="payment-method-desc">Thanh toán qua mã QR, thẻ ATM hoặc tài khoản ngân hàng nội địa</div>
                        </div>
                    </div>

                    <div
                        className={`payment-method-item momo ${paymentMethod === "momo" ? "selected" : ""}`}
                        onClick={() => setPaymentMethod("momo")}
                    >
                        <div className="payment-method-radio" />
                        <div className="payment-method-logo-wrapper" style={{ background: "#a5106c" }}>

                            <svg viewBox="0 0 40 40" className="payment-method-logo" width="30">
                                <circle cx="20" cy="20" r="18" fill="#a5106c" />
                                <text x="50%" y="58%" fill="#fff" fontWeight="bold" fontSize="11" fontFamily="Arial" textAnchor="middle">momo</text>
                            </svg>
                        </div>
                        <div className="payment-method-details">
                            <div className="payment-method-name">Ví điện tử MoMo (Mock)</div>
                            <div className="payment-method-desc">Thanh toán nhanh gọn qua ứng dụng ví điện tử MoMo</div>
                        </div>
                    </div>
                </div>
                <button
                    className="primary-button"
                    disabled={isProcessing || (timeLeft !== null && timeLeft <= 0)}
                    onClick={handlePayment}
                    style={{ width: "100%", padding: "14px 28px", fontSize: "16px", fontWeight: 700 }}
                    type="button"
                >
                    {isProcessing ? "Đang xử lý giao dịch..." : `Thanh Toán ${booking.finalAmount.toLocaleString("vi-VN")} đ`}
                </button>
                <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "8px", color: "#64748b", fontSize: "13px", justifyContent: "center" }}>
                    <SafetyCertificateOutlined style={{ color: "#10b981" }} />
                    <span>Thanh toán an toàn bảo mật, đạt chuẩn PCI-DSS</span>
                </div>
            </div>

            <div className="booking-summary-panel" style={{ height: "fit-content" }}>
                <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
                    {movie?.posterUrl ? (
                        <img
                            alt={movie.title}
                            src={movie.posterUrl}
                            style={{ width: "90px", borderRadius: "8px", objectFit: "cover", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}
                        />
                    ) : (
                        <div style={{ width: "90px", height: "130px", background: "#f1f5f9", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <VideoCameraOutlined style={{ fontSize: "24px", color: "#94a3b8" }} />
                        </div>
                    )}
                    <div>
                        <h3 className="summary-movie-title" style={{ margin: "0 0 6px", fontSize: "18px", lineHeight: 1.3 }}>{movie?.title}</h3>
                        <span style={{ background: "#ffe4e6", color: "#e11d48", padding: "3px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 700 }}>
                            {showtime?.format || "2D"}
                        </span>
                        <div style={{ marginTop: "10px", fontSize: "13px", color: "#64748b" }}>
                            {showtime?.language || "Phụ đề Tiếng Việt"}
                        </div>
                    </div>
                </div>
                <div className="summary-info-list">
                    <div className="summary-info-item">
                        <span className="label">Rạp chiếu</span>
                        <span className="val">{cinema?.name}</span>
                    </div>
                    <div className="summary-info-item">
                        <span className="label">Phòng chiếu</span>
                        <span className="val">{room?.name}</span>
                    </div>
                    <div className="summary-info-item">
                        <span className="label">Ngày chiếu</span>
                        <span className="val">
                            {showtime?.startTime ? format(new Date(showtime.startTime), "dd/MM/yyyy") : ""}
                        </span>
                    </div>
                    <div className="summary-info-item">
                        <span className="label">Suất chiếu</span>
                        <span className="val">
                            {showtime?.startTime ? format(new Date(showtime.startTime), "HH:mm") : ""}
                        </span>
                    </div>
                    <div className="summary-info-item">
                        <span className="label">Ghế đã chọn</span>
                        <span className="val" style={{ color: "#e11d48", fontWeight: 800 }}>
                            {seats.map((s: any) => s.seatCode).join(", ")}
                        </span>
                    </div>
                    <div className="summary-info-item">
                        <span className="label">Mã vé giữ chỗ</span>
                        <span className="val" style={{ fontFamily: "monospace", fontSize: "13px" }}>{booking.bookingCode}</span>
                    </div>
                </div>
                <div style={{ borderTop: "1px dashed #cbd5e1", margin: "16px 0" }} />
                <div className="summary-info-list">
                    <div className="summary-info-item">
                        <span className="label">Giá vé gốc</span>
                        <span className="val">{booking.totalSeatPrice.toLocaleString("vi-VN")} đ</span>
                    </div>
                    <div className="summary-info-item">
                        <span className="label">Khuyến mãi giảm</span>
                        <span className="val">-{booking.discountAmount.toLocaleString("vi-VN")} đ</span>
                    </div>
                </div>
                <div className="summary-total-price">
                    <span className="label">Tổng tiền thanh toán</span>
                    <span className="val">{booking.finalAmount.toLocaleString("vi-VN")} đ</span>
                </div>
                <Link
                    className="ghost-button"
                    style={{ width: "100%", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: "6px" }}
                    to={`/booking/${showtime?._id}`}
                >
                    <ArrowLeftOutlined /> Quay lại đổi ghế
                </Link>
            </div>
        </div>
    )

}

export default Payment