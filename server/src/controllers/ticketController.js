import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import BookingSeat from "../models/BookingSeat.js";
import { verifyTicketToken } from "../utils/ticketToken.js";
import { asyncHandler } from "../utils/asynHandler.js";

export const verifyTicket = asyncHandler(async (req, res) => {
  const { qrData } = req.body;

  if (!qrData) {
    return res.status(400).json({ ok: false, message: "Thiếu dữ liệu QR" });
  }

  const rawData = typeof qrData === "string" ? qrData.trim() : JSON.stringify(qrData);

  let bookingId = null;
  let bookingCode = null;

  // 1. Thử giải mã nếu qrData là JWT token
  try {
    const payload = verifyTicketToken(rawData);
    if (payload?.bookingId) {
      bookingId = payload.bookingId;
    }
  } catch (err) {
    // Không phải JWT token hợp lệ
  }

  // 2. Thử parse nếu qrData là chuỗi JSON
  if (!bookingId) {
    try {
      const parsed = JSON.parse(rawData);
      if (parsed.bookingId) bookingId = parsed.bookingId;
      if (parsed._id) bookingId = parsed._id;
      if (parsed.bookingCode) bookingCode = parsed.bookingCode;
    } catch (err) {
      // Không phải JSON string
    }
  }

  // 3. Nếu chưa tìm được bookingId/bookingCode, kiểm tra trực tiếp chuỗi văn bản
  if (!bookingId && !bookingCode) {
    if (mongoose.Types.ObjectId.isValid(rawData)) {
      bookingId = rawData;
    } else {
      bookingCode = rawData;
    }
  }

  // Tạo truy vấn tìm vé trong Database
  const query = {};
  if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
    query._id = bookingId;
  } else if (bookingCode) {
    query.bookingCode = bookingCode.toUpperCase();
  } else {
    return res.status(400).json({ ok: false, message: "Mã QR không chứa thông tin vé hợp lệ" });
  }

  const booking = await Booking.findOne(query)
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
    return res.status(404).json({ ok: false, message: "Không tìm thấy thông tin vé trong hệ thống" });
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

  // Đánh dấu thời gian check-in
  booking.checkedInAt = new Date();
  await booking.save();

  // Lấy thông tin ghế
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
