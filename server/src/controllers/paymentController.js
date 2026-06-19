import { asyncHandler } from "../utils/asynHandler.js";

import {
  createVnPayUrlService,
  verifyVnPayReturnService,
} from "../services/paymentService.js";

import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import BookingSeat from "../models/BookingSeat.js";

import { generateQR } from "../utils/qrCode.js";
import { sendMail } from "../utils/sendMail.js";
// import User from "../models/User.js";

/**
 * =========================
 * RESPONSE HELPER
 * =========================
 */
const ok = (res, data) =>
  res.status(200).json({ success: true, data });

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

/**
 * =========================
 * 1. CREATE PAYMENT URL
 * =========================
 */
export const createPaymentUrl = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;

  if (!bookingId) {
    return fail(res, 400, "Thiếu bookingId");
  }

  const ipAddr =
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    "127.0.0.1";

  const result = await createVnPayUrlService({
    bookingId,
    ipAddr,
  });

  return ok(res, result);
});

/**
 * =========================
 * 2. VNPay RETURN
 * =========================
 */
export const vnpayReturn = asyncHandler(async (req, res) => {
  const vnp_Params = req.query;

  if (!vnp_Params || Object.keys(vnp_Params).length === 0) {
    return fail(res, 400, "Không có dữ liệu VNPay");
  }

  // verify payment
  const result = await verifyVnPayReturnService(vnp_Params);

  console.log("VNPay RETURN RESULT:", result);

  if (result?.booking) {
    // 🔥 POPULATE FULL DATA
    const booking = await Booking.findById(result.booking._id)
      .populate("user")
      .populate({
        path: "showtime",
        populate: [
          {
            path: "movie",
          },
          {
            path: "cinema",
          },
          {
            path: "room",
          },
        ],
      });

    await handleSendTicket(booking);
  }

  return ok(res, {
    message: "VNPay xác nhận thanh toán",
    ...result,
  });
});

/**
 * =========================
 * 3. VNPay IPN
 * =========================
 */
export const vnpayIpn = asyncHandler(async (req, res) => {
  try {
    await verifyVnPayReturnService(req.query);

    return res.status(200).json({
      RspCode: "00",
      Message: "Confirm Success",
    });
  } catch (err) {
    return res.status(200).json({
      RspCode: "97",
      Message: err.message,
    });
  }
});

/**
 * =========================
 * 4. GET PAYMENT BY BOOKING
 * =========================
 */
export const getPaymentByBookingId = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  const payment = await Payment.findOne({ booking: bookingId });

  if (!payment) {
    return fail(res, 404, "Không tìm thấy payment");
  }

  return ok(res, payment);
});

/**
 * =========================
 * 5. MOCK MOMO SUCCESS
 * =========================
 */
export const mockMomoSuccess = async (req, res) => {
  const { paymentId } = req.query;

  const payment = await Payment.findById(paymentId);
  if (!payment) return res.send("Payment not found");

  payment.status = "paid";
  payment.transactionId = "MOCK_" + Date.now();
  payment.paidAt = new Date();
  await payment.save();

  const booking = await Booking.findById(payment.booking);
  booking.status = "confirmed";
  await booking.save();

  await BookingSeat.updateMany(
    { booking: booking._id },
    { status: "booked" }
  );

  await handleSendTicket(
    await Booking.findById(booking._id)
      .populate("user")
      .populate({
        path: "showtime",
        populate: [
          {
            path: "movie",
          },
          {
            path: "cinema",
          },
          {
            path: "room",
          },
        ],
      })
  );

  return res.redirect(
    `http://localhost:5173/payment-success?status=success&bookingId=${booking._id}`
  );
};

/**
 * =========================
 * 6. MOCK MOMO FAIL
 * =========================
 */
export const mockMomoFail = async (req, res) => {
  const { paymentId } = req.query;

  const payment = await Payment.findById(paymentId);
  if (!payment) return res.send("Payment not found");

  payment.status = "failed";
  payment.note = "Mock payment failed";
  await payment.save();

  const booking = await Booking.findById(payment.booking);

  booking.status = "cancelled";
  await booking.save();

  await BookingSeat.updateMany(
    { booking: booking._id },
    { status: "cancelled" }
  );

  return res.redirect(
    `http://localhost:5173/payment-success?status=fail&bookingId=${booking._id}`
  );
};

/**
 * =========================
 * 7. SEND TICKET EMAIL
 * =========================
 */
const handleSendTicket = async (booking) => {
  try {
    console.log("START SEND TICKET:", booking._id);

    const seats = await BookingSeat.find({ booking: booking._id });

    const ticketData = {
      bookingId: booking._id,
      bookingCode: booking.bookingCode,

      movie: booking.showtime?.movie?.title,
      cinema: booking.showtime?.cinema?.name,
      room: booking.showtime?.room?.name,
      time: booking.showtime?.startTime,

      seats: seats.map((s) => s.seatCode),
    };

    const qr = await generateQR(ticketData);
    const qrBase64 = qr.replace(
      /^data:image\/png;base64,/,
      ""
    );

    const user = booking.user;

    if (!user) {
      console.log("USER NOT FOUND");
      return;
    }

    console.log("SENDING EMAIL TO:", user.email);

    await sendMail({
      to: user.email,
      subject: "🎬 Vé xem phim đã xác nhận",

      attachments: [
        {
          filename: "ticket-qr.png",
          content: qrBase64,
          encoding: "base64",
          cid: "ticketqr",
        },
      ],

      html: `
        <div style="font-family:Arial">
          <h2>🎉 Đặt vé thành công</h2>

          <p><b>Mã booking:</b> ${booking.bookingCode || booking._id}</p>
          <p><b>Phim:</b> ${booking.showtime?.movie?.title || ""}</p>
          <p><b>Rạp:</b> ${booking.showtime?.cinema?.name || ""}</p>
          <p><b>Phòng:</b> ${booking.showtime?.room?.name || ""}</p>
          <p><b>Giờ chiếu:</b> ${booking.showtime?.startTime || ""}</p>

          <p><b>Ghế:</b> ${seats.map((s) => s.seatCode).join(", ")}</p>

          <h3>📌 QR Code:</h3>
          <img src="cid:ticketqr" width="220"/>

          <p>Vui lòng dùng QR này để vào rạp</p>
        </div>
      `,
    });

    console.log("EMAIL SENT SUCCESS");
  } catch (err) {
    console.error("SEND TICKET ERROR:", err);
  }
};