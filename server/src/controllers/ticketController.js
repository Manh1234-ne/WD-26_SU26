import Booking from "../models/Booking.js";
import BookingSeat from "../models/BookingSeat.js";
import { verifyTicketToken } from "../utils/ticketToken.js";
import { asyncHandler } from "../utils/asynHandler.js";

export const verifyTicket = asyncHandler(async (req, res) => {
    const { qrData } = req.body;

    if (!qrData) {
        return res.status(400).json({ ok: false, message: "Thiếu dữ liệu QR" });
    }

    let payload;
    try {
        payload = verifyTicketToken(qrData);
    } catch (err) {
        return res.status(400).json({ ok: false, message: "Mã QR không hợp lệ hoặc đã hết hạn" });
    }

    if (!payload?.bookingId) {
        return res.status(400).json({ ok: false, message: "Dữ liệu vé không hợp lệ" });
    }

    const booking = await Booking.findById(payload.bookingId)
        .populate("user")
        .populate({
            path: "showtime",
            populate: [
                { path: "movie" },
                { path: "room" },
                { path: "cinema" }
            ]
        });

    if (!booking) {
        return res.status(404).json({ ok: false, message: "Không tìm thấy thông tin vé" });
    }

    if (booking.status !== "confirmed" && booking.status !== "completed") {
        return res.status(400).json({ ok: false, message: "Vé chưa được thanh toán hoặc đã bị hủy" });
    }

    if (booking.checkedInAt) {
        return res.status(409).json({
            ok: false,
            message: `Vé này đã được check-in lúc ${new Date(booking.checkedInAt).toLocaleString("vi-VN")}`,
            checkedInAt: booking.checkedInAt,
        });
    }

    booking.checkedInAt = new Date();
    await booking.save();

    const seats = await BookingSeat.find({ booking: booking._id });
    return res.status(200).json({
        ok: true,
        message: "Xác thực vé và check-in thành công",
        booking: {
            id: booking._id,
            bookingCode: booking.bookingCode,
            movieTitle: booking.showtime?.movie?.title || "N/A",
            roomName: booking.showtime?.room?.name || "N/A",
            showtime: booking.showtime?.startTime,
            seats: seats.map((s) => s.seatCode).join(", "),
            customerName: booking.user?.fullName || "Khách hàng",
            customerEmail: booking.user?.email || "",
            checkedInAt: booking.checkedInAt,
        },
    });
});
